from __future__ import annotations

import csv
import sys
from datetime import date, datetime, timezone
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import modo as main


class FakeClient:
    def __init__(self, pages):
        self.pages = pages
        self.calls = []

    def get_terminal_activities(self, station_id, terminal_id, *, limit=100, offset=0):
        self.calls.append((station_id, terminal_id, limit, offset))
        return self.pages.get((terminal_id, offset), [])


def pacific_timestamp(year, month, day, hour=12, minute=0):
    pacific = main.ZoneInfo("America/Vancouver")
    return int(datetime(year, month, day, hour, minute, tzinfo=pacific).timestamp())


def test_fetch_all_activity_records_paginates_until_short_page():
    client = FakeClient(
        {
            ("terminal-1", 0): [{"date": 1}, {"date": 2}],
            ("terminal-1", 2): [{"date": 3}, {"date": 4}],
            ("terminal-1", 4): [{"date": 5}],
        }
    )

    records = main.fetch_all_activity_records(client, "station-1", "terminal-1", limit=2)

    assert records == [{"date": 1}, {"date": 2}, {"date": 3}, {"date": 4}, {"date": 5}]
    assert client.calls == [
        ("station-1", "terminal-1", 2, 0),
        ("station-1", "terminal-1", 2, 2),
        ("station-1", "terminal-1", 2, 4),
    ]


def test_write_csv_preserves_raw_api_values(tmp_path):
    records = [
        {
            "date": 1711954800,
            "energyConsumed": 12345,
            "transactionId": "abc",
            "nested": {"kept": True},
        }
    ]
    path = tmp_path / "stall.csv"

    main.write_activity_csv(path, records)

    with path.open(newline="") as f:
        [row] = list(csv.DictReader(f))
    assert row["date"] == "1711954800"
    assert row["energyConsumed"] == "12345"
    assert row["transactionId"] == "abc"
    assert row["nested"] == '{"kept": true}'
    assert "cost" not in row
    assert "pacific" not in row


def test_pacific_month_boundaries_are_used_for_filtering_and_aggregation():
    # 2024-04-01 06:59 UTC is still March 31 in America/Vancouver;
    # 2024-04-01 07:00 UTC is April 1 in America/Vancouver.
    march_record = {"date": int(datetime(2024, 4, 1, 6, 59, tzinfo=timezone.utc).timestamp()), "energyConsumed": 1000}
    april_record = {"date": int(datetime(2024, 4, 1, 7, 0, tzinfo=timezone.utc).timestamp()), "energyConsumed": 2000}

    summary = main.summarize_terminal_months(
        "Stall #45",
        [march_record, april_record],
        date(2024, 3, 1),
        date(2024, 4, 1),
    )

    by_month = {row["month"]: row for row in summary}
    assert by_month["2024-03"]["activity_count"] == 1
    assert by_month["2024-03"]["kwh"] == 1.0
    assert by_month["2024-04"]["activity_count"] == 1
    assert by_month["2024-04"]["kwh"] == 2.0


def test_rate_changes_apply_on_activity_pacific_date_and_round_monthly_totals_only():
    records = [
        {"date": pacific_timestamp(2025, 3, 31, 23, 59), "energyConsumed": 1000},
        {"date": pacific_timestamp(2025, 4, 1, 0, 0), "energyConsumed": 1000},
        {"date": pacific_timestamp(2025, 4, 2, 12, 0), "energyConsumed": 333},
    ]

    summary = main.summarize_terminal_months(
        "Stall #45", records, date(2025, 3, 1), date(2025, 4, 1)
    )

    by_month = {row["month"]: row for row in summary}
    assert by_month["2025-03"]["cost"] == pytest.approx(0.1044 * float(main.GST_MULTIPLIER))
    expected_april_unrounded = (1.0 + 0.333) * 0.1119 * float(main.GST_MULTIPLIER)
    assert by_month["2025-04"]["cost"] == pytest.approx(expected_april_unrounded)
    markdown = main.render_markdown_report(summary)
    assert "$0.16" in markdown  # rounded monthly total, not rounded per activity


def test_export_writes_filtered_csv_and_zero_activity_report(tmp_path):
    terminal = {"id": "terminal-46", "name": "Stall # 46"}
    in_range = {"date": pacific_timestamp(2024, 5, 15), "energyConsumed": 1000}
    out_of_range = {"date": pacific_timestamp(2024, 7, 1), "energyConsumed": 9999}
    client = FakeClient({("terminal-46", 0): [in_range, out_of_range]})

    result = main.export_selected_terminals(
        client,
        station_id="station-1",
        terminals=[terminal],
        selected_names=["Stall #46"],
        start_month=date(2024, 5, 1),
        end_month=date(2024, 6, 1),
        output_dir=tmp_path,
        limit=100,
    )

    csv_path = tmp_path / "Stall_46.csv"
    report_path = tmp_path / "monthly_report.md"
    assert result.csv_paths == {"Stall # 46": csv_path}
    assert result.report_path == report_path
    assert csv_path.exists()
    assert report_path.exists()
    with csv_path.open(newline="") as f:
        rows = list(csv.DictReader(f))
    assert rows == [{"date": str(in_range["date"]), "energyConsumed": "1000"}]
    report = report_path.read_text()
    assert "| 2024-05 | Stall # 46 | 1.00 | $0.11 | 1 |" in report
    assert "| 2024-06 | Stall # 46 | 0.00 | $0.00 | 0 |" in report
    assert "2024-07" not in report
    assert "Bearer" not in report


def test_empty_export_writes_csv_header_and_zero_month(tmp_path):
    terminal = {"id": "terminal-45", "name": "Stall #45"}
    client = FakeClient({("terminal-45", 0): []})

    main.export_selected_terminals(
        client,
        station_id="station-1",
        terminals=[terminal],
        selected_names=["Stall #45"],
        start_month=date(2024, 5, 1),
        end_month=date(2024, 5, 1),
        output_dir=tmp_path,
    )

    assert (tmp_path / "Stall_45.csv").read_text() == "date,energyConsumed\n"
    assert "| 2024-05 | Stall #45 | 0.00 | $0.00 | 0 |" in (tmp_path / "monthly_report.md").read_text()


def test_default_terminal_selection_accepts_evduty_stall_spacing():
    assert main.default_selected_terminal_names(["Stall # 45", "Stall # 46", "Other"]) == [
        "Stall # 45",
        "Stall # 46",
    ]
