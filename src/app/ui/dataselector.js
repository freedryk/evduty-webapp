"use client";

import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

import styles from "@/app/ui/page.module.css";

function TerminalSelector() {
  return (
    <div className={styles.terminalselector}>
      <select name="terminals" id="terminals" multiple>
        <option value="terminal1">Terminal 1</option>
        <option value="terminal2">Terminal 2</option>
        <option value="terminal3">Terminal 3</option>
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

export default function DataSelector() {
  return (
    <div>
      <TerminalSelector />
      <Calendar />
      <AveragingSelector />
    </div>
  );
}
