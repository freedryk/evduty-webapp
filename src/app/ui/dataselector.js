"use client";

import { useState } from "react";

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

  return (
    <div className={styles.terminalselector}>
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
      <label htmlFor="averaging-overall">Overall Averages</label>
    </div>
  );
}

export default function DataSelector({ terminals = [], className }) {
  const [selectedTerminals, setSelectedTerminals] = useState([]);
  const [averaging, setAveraging] = useState("Monthly");
  const [dateRange, setDateRange] = useState([new Date(), new Date()]);

  const handleDateChange = (nextValue) => {
    if (Array.isArray(nextValue)) {
      setDateRange(nextValue);
      return;
    }

    setDateRange([nextValue, nextValue]);
  };

  const [startDate, endDate] = dateRange;

  return (
    <div className={className}>
      <TerminalSelector
        terminals={terminals}
        selectedTerminals={selectedTerminals}
        setSelectedTerminals={setSelectedTerminals}
      />
      <Calendar selectRange onChange={handleDateChange} value={dateRange} />
      <input type="hidden" name="startDate" value={formatDate(startDate)} />
      <input type="hidden" name="endDate" value={formatDate(endDate)} />
      <AveragingSelector averaging={averaging} setAveraging={setAveraging} />
    </div>
  );
}
