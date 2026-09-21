"use client";

import { useEffect, useState } from "react";

import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

import styles from "@/app/ui/page.module.css";

function TerminalSelector({
  terminals = [],
  selectedTerminals,
  setSelectedTerminals,
}) {
  const handleChange = (e) => {
    const selectedValues = Array.from(
      e.target.selectedOptions,
      (option) => option.value,
    );
    setSelectedTerminals(selectedValues);
  };

  const allSelected =
    terminals.length > 0 && selectedTerminals.length === terminals.length;

  const handleSelectAllChange = (e) => {
    setSelectedTerminals(
      e.target.checked ? terminals.map((terminal) => terminal.id) : [],
    );
  };

  return (
    <div className={styles.terminalselector}>
      <div>
        <input
          type="checkbox"
          id="terminals-select-all"
          checked={allSelected}
          onChange={handleSelectAllChange}
        />
        <label htmlFor="terminals-select-all">All terminals</label>
      </div>
      <label htmlFor="terminals" className={styles.srOnly}>
        Terminals
      </label>
      <select
        name="terminals"
        id="terminals"
        multiple
        onChange={handleChange}
        value={selectedTerminals}
      >
        {terminals.map((terminal) => (
          <option key={terminal.id} value={terminal.id}>
            {terminal.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function formatDate(date) {
  if (!date) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function DateRangeSelector({ dateRange, setDateRange }) {
  return (
    <div className={styles.monthSelector}>
      <Calendar
        selectRange
        maxDetail="year"
        view="year"
        onChange={setDateRange}
        value={dateRange}
      />
    </div>
  );
}

function AveragingSelector({ averaging, setAveraging }) {
  const handleChange = (e) => {
    setAveraging(e.target.value);
  };

  return (
    <div className={styles.averagingselector}>
      <input
        type="radio"
        id="averaging-monthly"
        name="averaging"
        value="Monthly"
        checked={averaging === "Monthly"}
        onChange={handleChange}
      />
      <label htmlFor="averaging-monthly">Monthly Averages</label>
      <input
        type="radio"
        id="averaging-raw"
        name="averaging"
        value="Raw"
        checked={averaging === "Raw"}
        onChange={handleChange}
      />
      <label htmlFor="averaging-raw">Raw Data</label>
      <input
        type="radio"
        id="averaging-overall"
        name="averaging"
        value="Overall"
        checked={averaging === "Overall"}
        onChange={handleChange}
      />
      <label htmlFor="averaging-overall">Overall Totals</label>
    </div>
  );
}

export default function DataSelector({ terminals = [], className }) {
  const [selectedTerminals, setSelectedTerminals] = useState([]);
  const [averaging, setAveraging] = useState("Monthly");
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    return [startOfMonth(today), endOfMonth(today)];
  });

  useEffect(() => {
    setSelectedTerminals(terminals.map((terminal) => terminal.id));
  }, [terminals]);

  const [rangeStart, rangeEnd] = Array.isArray(dateRange)
    ? dateRange
    : [dateRange, dateRange];
  const startDate = startOfMonth(rangeStart);
  const endDate = endOfMonth(rangeEnd);

  return (
    <div className={className}>
      <TerminalSelector
        terminals={terminals}
        selectedTerminals={selectedTerminals}
        setSelectedTerminals={setSelectedTerminals}
      />
      <DateRangeSelector dateRange={dateRange} setDateRange={setDateRange} />
      <input type="hidden" name="startDate" value={formatDate(startDate)} />
      <input type="hidden" name="endDate" value={formatDate(endDate)} />
      <AveragingSelector averaging={averaging} setAveraging={setAveraging} />
    </div>
  );
}
