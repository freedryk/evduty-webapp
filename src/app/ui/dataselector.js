"use client";

import { useState } from "react";

import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

import styles from "@/app/ui/page.module.css";

function TerminalSelector({ terminals = [], selectedTerminals, setSelectedTerminals }) {
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

function AveragingSelector() {
  return (
    <div className={styles.averagingselector}>
      <input
        type="radio"
        id="averaging-monthly"
        name="averaging-monthly"
        value="Monthly"
      />
      <label htmlFor="averaging-monthly">Monthly Averages</label>
      <input type="radio" id="averaging-raw" name="averaging-raw" value="Raw" />
      <label htmlFor="averaging-raw">Raw Data</label>
      <input
        type="radio"
        id="averaging-overall"
        name="averaging-overall"
        value="Overall"
      />
      <label htmlFor="averaging-overall">Overall Averages</label>
    </div>
  );
}

export default function DataSelector({ terminals = [], className }) {
  const [selectedTerminals, setSelectedTerminals] = useState([]);

  return (
    <div className={className}>
      <TerminalSelector
        terminals={terminals}
        selectedTerminals={selectedTerminals}
        setSelectedTerminals={setSelectedTerminals}
      />
      <Calendar />
      <AveragingSelector />
    </div>
  );
}
