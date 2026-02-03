"use client"

import Calendar from "react-calendar"
import "react-calendar/dist/Calendar.css"

import styles from "@/app/ui/page.module.css"

function TerminalSelector({ terminals }) {
  return (
    <div className={styles.terminalselector}>
      <select name="terminals" id="terminals" multiple>
        {terminals.map((terminal) => (
          <option key={terminal.id} value={terminal.name}>
            {terminal.name}
          </option>
        ))}
      </select>
    </div>
  )
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
  )
}

export default function DataSelector({ station }) {
  return (
    <div>
      <TerminalSelector terminals={station.terminals} />
      <Calendar />
      <AveragingSelector />
    </div>
  )
}
