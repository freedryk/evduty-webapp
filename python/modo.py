from __future__ import annotations

import csv
import getpass
import json
import re
from dataclasses import dataclass
from datetime import UTC, date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any, Iterable
from zoneinfo import ZoneInfo

import requests

try:
    import marimo
except ModuleNotFoundError:  # pragma: no cover - lets unit tests import the helpers without marimo installed.
    marimo = None


REQUEST_TIMEOUT = 30
BASE_URL = "https://api.evduty.net/"
PACIFIC_TIMEZONE = ZoneInfo("America/Vancouver")
GST_MULTIPLIER = Decimal("1.05")
DEFAULT_TERMINAL_NAMES = ["Stall #45", "Stall #46"]
DEFAULT_OUTPUT_DIR = Path("evduty_exports")
DEFAULT_REPORT_FILENAME = "monthly_report.md"
EMPTY_ACTIVITY_COLUMNS = ["date", "energyConsumed"]

# Energy rates by effective Pacific date. The open-ended first row is the legacy
# rate used by the original script for activity before April 2024.
RATE_SCHEDULE: tuple[tuple[date, Decimal], ...] = (
    (date.min, Decimal("0.0975")),
    (date(2024, 4, 1), Decimal("0.1044")),
    (date(2025, 4, 1), Decimal("0.1119")),
    (date(2026, 4, 1), Decimal("0.1169")),
)


class EVDutyError(RuntimeError):
    """Raised for expected EVDuty export failures."""


@dataclass(frozen=True)
class ExportResult:
    csv_paths: dict[str, Path]
    report_path: Path
    markdown: str
    rows: list[dict[str, Any]]


class EVDutyClient:
    def __init__(
        self,
        token: str,
        *,
        base_url: str = BASE_URL,
        session: requests.Session | None = None,
        timeout: int = REQUEST_TIMEOUT,
    ) -> None:
        self.token = token
        self.base_url = base_url.rstrip("/") + "/"
        self.session = session or requests.Session()
        self.timeout = timeout

    def get_json(self, endpoint: str, query_params: dict[str, Any] | None = None) -> Any:
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json;charset=UTF-8",
            "Authorization": f"Bearer {self.token}",
        }
        response = self.session.get(
            f"{self.base_url}{endpoint.lstrip('/')}",
            headers=headers,
            params=query_params,
            timeout=self.timeout,
        )
        response.raise_for_status()
        return response.json()

    def get_stations(self) -> list[dict[str, Any]]:
        stations = self.get_json("v1/account/stations")
        if not isinstance(stations, list):
            raise EVDutyError("Unexpected station response from EVDuty")
        return stations

    def get_station(self) -> dict[str, Any]:
        stations = self.get_stations()
        if not stations:
            raise EVDutyError("No stations found for the authenticated account")
        return stations[0]

    def get_terminals(self, station_id: str | None = None) -> list[dict[str, Any]]:
        if station_id is None:
            station = self.get_station()
        else:
            station = next(
                (station for station in self.get_stations() if str(station.get("id")) == str(station_id)),
                None,
            )
            if station is None:
                raise EVDutyError(f"Station {station_id!r} was not found")
        terminals = station.get("terminals", [])
        if not isinstance(terminals, list):
            raise EVDutyError("Unexpected terminal response from EVDuty")
        return terminals

    def get_terminal_activities(
        self,
        station_id: str,
        terminal_id: str,
        *,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        response = self.get_json(
            f"v2/account/stations/{station_id}/terminals/{terminal_id}/activities",
            query_params={"limit": limit, "offset": offset},
        )
        if not isinstance(response, dict) or "data" not in response:
            raise EVDutyError("Unexpected activity response from EVDuty")
        data = response["data"]
        if not isinstance(data, list):
            raise EVDutyError("Unexpected activity response from EVDuty")
        return data


def login(email: str | None = None, password: str | None = None) -> str:
    """Authenticate without logging credentials or the returned token."""

    if email is None:
        email = input("Enter your email: ")
    if password is None:
        password = getpass.getpass("Enter your password: ")

    post_data = {
        "email": email,
        "password": password,
        "device": {
            "id": "A",
            "model": "A",
            "type": "ANDROID",
        },
    }
    response = requests.post(
        "https://api.evduty.net/v1/account/login",
        json=post_data,
        timeout=REQUEST_TIMEOUT,
    )
    response.raise_for_status()
    payload = response.json()
    return payload["accessToken"]


# Backwards-compatible wrappers used by the earlier script.
def call_api(token: str, endpoint: str, query_params: dict[str, Any] | None = None) -> Any:
    return EVDutyClient(token).get_json(endpoint, query_params)


def fetch_all_activity_records(
    client: Any,
    station_id: str,
    terminal_id: str,
    *,
    limit: int = 100,
) -> list[dict[str, Any]]:
    """Fetch all paginated activity records for a terminal.

    The EVDuty API wrapper intentionally does not send a date filter; month
    filtering is applied locally after all pages have been retrieved.
    """

    offset = 0
    records: list[dict[str, Any]] = []
    while True:
        page = client.get_terminal_activities(station_id, terminal_id, limit=limit, offset=offset)
        records.extend(page)
        if len(page) < limit:
            return records
        offset += limit


def current_pacific_month(today: datetime | None = None) -> date:
    now = today.astimezone(PACIFIC_TIMEZONE) if today else datetime.now(PACIFIC_TIMEZONE)
    return date(now.year, now.month, 1)


def normalize_month(value: str | date | datetime) -> date:
    if isinstance(value, datetime):
        return date(value.year, value.month, 1)
    if isinstance(value, date):
        return date(value.year, value.month, 1)
    if isinstance(value, str):
        year, month = value[:7].split("-")
        return date(int(year), int(month), 1)
    raise TypeError(f"Unsupported month value: {value!r}")


def add_month(month: date) -> date:
    if month.month == 12:
        return date(month.year + 1, 1, 1)
    return date(month.year, month.month + 1, 1)


def iter_months(start_month: date, end_month: date) -> Iterable[date]:
    start = normalize_month(start_month)
    end = normalize_month(end_month)
    if end < start:
        raise ValueError("End month must be the same as or after the start month")
    current = start
    while current <= end:
        yield current
        current = add_month(current)


def unix_to_pacific_datetime(unix_timestamp: int | float | str) -> datetime:
    return datetime.fromtimestamp(float(unix_timestamp), tz=UTC).astimezone(PACIFIC_TIMEZONE)


def rate_for_pacific_date(pacific_day: date) -> Decimal:
    rate = RATE_SCHEDULE[0][1]
    for effective_date, candidate in RATE_SCHEDULE:
        if pacific_day >= effective_date:
            rate = candidate
        else:
            break
    return rate


def _energy_kwh(record: dict[str, Any]) -> Decimal:
    raw_value = record.get("energyConsumed", 0) or 0
    return Decimal(str(raw_value)) / Decimal("1000")


def cost_for_activity(record: dict[str, Any]) -> Decimal:
    pacific_date = unix_to_pacific_datetime(record["date"]).date()
    return _energy_kwh(record) * rate_for_pacific_date(pacific_date) * GST_MULTIPLIER


def filter_records_by_month(
    records: list[dict[str, Any]],
    start_month: date,
    end_month: date,
) -> list[dict[str, Any]]:
    selected_months = set(iter_months(start_month, end_month))
    filtered: list[dict[str, Any]] = []
    for record in records:
        if "date" not in record:
            continue
        pacific_date_time = unix_to_pacific_datetime(record["date"])
        activity_month = date(pacific_date_time.year, pacific_date_time.month, 1)
        if activity_month in selected_months:
            filtered.append(record)
    return filtered


def summarize_terminal_months(
    terminal_name: str,
    records: list[dict[str, Any]],
    start_month: date,
    end_month: date,
) -> list[dict[str, Any]]:
    summaries = {
        month: {"kwh": Decimal("0"), "cost": Decimal("0"), "activity_count": 0}
        for month in iter_months(start_month, end_month)
    }

    for record in records:
        if "date" not in record:
            continue
        pacific_date_time = unix_to_pacific_datetime(record["date"])
        activity_month = date(pacific_date_time.year, pacific_date_time.month, 1)
        if activity_month not in summaries:
            continue
        summaries[activity_month]["kwh"] += _energy_kwh(record)
        summaries[activity_month]["cost"] += cost_for_activity(record)
        summaries[activity_month]["activity_count"] += 1

    return [
        {
            "month": month.strftime("%Y-%m"),
            "terminal_name": terminal_name,
            "kwh": float(values["kwh"]),
            "cost": float(values["cost"]),
            "activity_count": values["activity_count"],
        }
        for month, values in summaries.items()
    ]


def _format_cost(value: float) -> str:
    return f"${value:.2f}"


def render_markdown_report(rows: list[dict[str, Any]]) -> str:
    lines = [
        "# EVDuty Monthly Stall Report",
        "",
        "Monthly totals use America/Vancouver dates. Costs include 5% GST and are rounded only for display.",
        "",
        "| Month | Stall | kWh | Cost | Activity count |",
        "| --- | --- | ---: | ---: | ---: |",
    ]
    for row in rows:
        lines.append(
            "| {month} | {terminal_name} | {kwh:.2f} | {cost} | {activity_count} |".format(
                month=row["month"],
                terminal_name=row["terminal_name"],
                kwh=row["kwh"],
                cost=_format_cost(row["cost"]),
                activity_count=row["activity_count"],
            )
        )
    lines.append("")
    return "\n".join(lines)


def _json_safe(value: Any) -> Any:
    if isinstance(value, (dict, list)):
        return json.dumps(value, sort_keys=True)
    return value


def _csv_fieldnames(records: list[dict[str, Any]]) -> list[str]:
    if not records:
        return EMPTY_ACTIVITY_COLUMNS.copy()
    fieldnames: list[str] = []
    for record in records:
        for key in record.keys():
            if key not in fieldnames:
                fieldnames.append(key)
    return fieldnames


def write_activity_csv(path: Path, records: list[dict[str, Any]]) -> None:
    """Write raw API records without mutating API values such as date or energy."""

    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = _csv_fieldnames(records)
    with path.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for record in records:
            writer.writerow({key: _json_safe(record.get(key, "")) for key in fieldnames})


def safe_filename(name: str) -> str:
    safe = re.sub(r"[^A-Za-z0-9._-]+", "_", name).strip("._")
    return safe or "terminal"


def normalize_terminal_name(name: str) -> str:
    return re.sub(r"#\s+", "#", " ".join(str(name).split())).casefold()


def default_selected_terminal_names(available_names: Iterable[str]) -> list[str]:
    default_keys = {normalize_terminal_name(name) for name in DEFAULT_TERMINAL_NAMES}
    return [name for name in available_names if normalize_terminal_name(name) in default_keys]


def _selected_terminal_names(terminals: list[dict[str, Any]], selected_names: list[str]) -> list[dict[str, Any]]:
    selected_keys = {normalize_terminal_name(name) for name in selected_names}
    return [
        terminal
        for terminal in terminals
        if normalize_terminal_name(str(terminal.get("name", ""))) in selected_keys
    ]


def export_selected_terminals(
    client: Any,
    *,
    station_id: str,
    terminals: list[dict[str, Any]],
    selected_names: list[str],
    start_month: date,
    end_month: date,
    output_dir: str | Path = DEFAULT_OUTPUT_DIR,
    limit: int = 100,
) -> ExportResult:
    if not selected_names:
        raise EVDutyError("Select at least one terminal before exporting")
    selected = _selected_terminal_names(terminals, selected_names)
    selected_keys = {normalize_terminal_name(str(terminal.get("name", ""))) for terminal in selected}
    missing = [name for name in selected_names if normalize_terminal_name(name) not in selected_keys]
    if missing:
        raise EVDutyError(f"Selected terminal(s) not found: {', '.join(missing)}")

    output_path = Path(output_dir)
    rows: list[dict[str, Any]] = []
    csv_paths: dict[str, Path] = {}
    for terminal in selected:
        terminal_name = str(terminal["name"])
        terminal_id = str(terminal["id"])
        records = fetch_all_activity_records(client, station_id, terminal_id, limit=limit)
        records_in_range = filter_records_by_month(records, start_month, end_month)
        csv_path = output_path / f"{safe_filename(terminal_name)}.csv"
        write_activity_csv(csv_path, records_in_range)
        csv_paths[terminal_name] = csv_path
        rows.extend(summarize_terminal_months(terminal_name, records, start_month, end_month))

    rows.sort(key=lambda row: (row["month"], row["terminal_name"]))
    markdown = render_markdown_report(rows)
    output_path.mkdir(parents=True, exist_ok=True)
    report_path = output_path / DEFAULT_REPORT_FILENAME
    report_path.write_text(markdown)
    return ExportResult(csv_paths=csv_paths, report_path=report_path, markdown=markdown, rows=rows)


def get_activity(token: str, station_id: str, terminal_id: str, limit: int = 100) -> list[dict[str, Any]]:
    return fetch_all_activity_records(EVDutyClient(token), station_id, terminal_id, limit=limit)


def main() -> None:
    token = login()
    client = EVDutyClient(token)
    station = client.get_station()
    terminals = client.get_terminals(str(station["id"]))
    selected_names = default_selected_terminal_names(str(t.get("name")) for t in terminals)
    result = export_selected_terminals(
        client,
        station_id=str(station["id"]),
        terminals=terminals,
        selected_names=selected_names,
        start_month=current_pacific_month(),
        end_month=current_pacific_month(),
        output_dir=DEFAULT_OUTPUT_DIR,
    )
    print(f"Wrote report to {result.report_path}")


if marimo is not None:
    app = marimo.App(width="medium")

    @app.cell
    def _():
        import marimo as mo

        return (mo,)

    @app.cell
    def _(mo):
        mo.md(
            """
            # EVDuty stall invoice export

            Enter EVDuty credentials, load terminals, choose an inclusive Pacific month range and selected stalls, then run the export. Credentials and tokens are not written to output files.
            """
        )
        email = mo.ui.text(label="EVDuty email")
        password = mo.ui.text(label="EVDuty password", kind="password")
        load_terminals = mo.ui.run_button(label="Authenticate and load terminals")
        mo.vstack([email, password, load_terminals])
        return email, load_terminals, password

    @app.cell
    def _(email, load_terminals, mo, password):
        token = None
        client = None
        station = None
        terminals = []
        if load_terminals.value:
            if not email.value or not password.value:
                mo.stop(True, mo.md("Enter your email and password before loading terminals."))
            token = login(email.value, password.value)
            client = EVDutyClient(token)
            station = client.get_station()
            terminals = client.get_terminals(str(station["id"]))
        return client, station, terminals

    @app.cell
    def _(mo, terminals):
        available_names = [str(terminal.get("name")) for terminal in terminals]
        default_names = default_selected_terminal_names(available_names)
        selected_stalls = mo.ui.multiselect(
            options=available_names,
            value=default_names,
            label="Terminal names",
        )
        month = current_pacific_month()
        start_month = mo.ui.date(value=month, label="Start month (inclusive)")
        end_month = mo.ui.date(value=month, label="End month (inclusive)")
        output_dir = mo.ui.text(value=str(DEFAULT_OUTPUT_DIR), label="Output directory")
        export_button = mo.ui.run_button(label="Export CSVs and Markdown report")
        mo.vstack([start_month, end_month, selected_stalls, output_dir, export_button])
        return end_month, export_button, output_dir, selected_stalls, start_month

    @app.cell
    def _(client, end_month, export_button, mo, output_dir, selected_stalls, start_month, station, terminals):
        if export_button.value:
            if client is None or station is None:
                mo.stop(True, mo.md("Authenticate and load terminals before exporting."))
            result = export_selected_terminals(
                client,
                station_id=str(station["id"]),
                terminals=terminals,
                selected_names=list(selected_stalls.value),
                start_month=normalize_month(start_month.value),
                end_month=normalize_month(end_month.value),
                output_dir=output_dir.value or DEFAULT_OUTPUT_DIR,
            )
            mo.md(
                f"Wrote {len(result.csv_paths)} CSV file(s) and combined report to `{result.report_path}`.\n\n"
                + result.markdown
            )
        else:
            mo.md("Click **Export CSVs and Markdown report** to overwrite matching output files.")
        return

else:
    app = None


if __name__ == "__main__":
    if app is not None:
        app.run()
    else:
        main()
