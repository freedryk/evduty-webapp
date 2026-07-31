"use client";

import { useState, useContext, useEffect } from "react";

import { TokenContext } from "@/app/ui/login.js";

import DataSelector from "@/app/ui/dataselector.js";
import UsageDisplay from "@/app/ui/usagedisplay.js";

import { get, getActivities } from "@/app/lib/evduty_api.js";
import {
  normalizeSessions,
  filterSessionsByDateRange,
  aggregateSessions,
} from "@/app/lib/usage.js";

import styles from "@/app/ui/page.module.css";

export default function MainMenu() {
  const [data, setData] = useState(null);
  const [usageState, setUsageState] = useState({ status: "idle" });

  const { token } = useContext(TokenContext);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await get(token.accessToken, "v1/account/stations");
        const data = await response.json();
        setData(data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, [token]);

  // Find the hardwired station and extract its terminals
  const HARDWIRED_STATION_ID = "65d634a280b3eaadad082254";
  const hardwiredStation = data?.find(
    (station) => station.id === HARDWIRED_STATION_ID,
  );
  const terminals = hardwiredStation?.terminals || [];

  const handleDataRequest = async (formData) => {
    const terminalIds = formData.getAll("terminals");
    const startDate = formData.get("startDate");
    const endDate = formData.get("endDate");
    const averaging = formData.get("averaging");

    if (terminalIds.length === 0) {
      setUsageState({
        status: "error",
        error: "Select at least one terminal.",
      });
      return;
    }

    setUsageState({ status: "loading" });

    const terminalsById = Object.fromEntries(
      terminals.map((terminal) => [terminal.id, terminal]),
    );

    try {
      const perTerminal = await Promise.all(
        terminalIds.map(async (id) => {
          const raw = await getActivities(
            token.accessToken,
            HARDWIRED_STATION_ID,
            id,
          );
          return normalizeSessions(raw, terminalsById[id]);
        }),
      );

      const filtered = filterSessionsByDateRange(
        perTerminal.flat(),
        startDate,
        endDate,
      );
      const result = aggregateSessions(filtered, averaging);

      setUsageState({
        status: "success",
        result,
        terminals: terminalIds.map((id) => terminalsById[id]),
      });
    } catch (error) {
      console.error("Error fetching usage data:", error);
      setUsageState({ status: "error", error: error.message });
    }
  };

  const content = (
    <div>
      <form action={handleDataRequest}>
        <DataSelector className={styles.dataSelector} terminals={terminals} />
        <button type="submit">Submit</button>
      </form>
      <UsageDisplay
        status={usageState.status}
        error={usageState.error}
        result={usageState.result}
        selectedTerminals={usageState.terminals}
      />
    </div>
  );

  return (
    <div>
      <h1>Select</h1>
      {content}
    </div>
  );
}
