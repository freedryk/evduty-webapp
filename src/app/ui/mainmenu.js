"use client";

import { useState, useContext, useEffect } from "react";

import { TokenContext } from "@/app/ui/login.js";

import DataSelector from "@/app/ui/dataselector.js";

import { get } from "@/app/lib/evduty_api.js";

import styles from "@/app/ui/page.module.css";

export default function MainMenu() {
  const [data, setData] = useState(null);

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

  console.log("data:", JSON.stringify(data));

  const handleDataRequest = async (formData) => {
    // placeholder code
    // TODO: replace with actual data request
    console.log("handleDataRequest:", formData);
    // const terminals = formData.get("terminals");
    // const startDate = formData.get("startDate");
    // const endDate = formData.get("endDate");
    // const averaging = formData.get("averaging");
  };

  // Find the hardwired station and extract its terminals
  const HARDWIRED_STATION_ID = "65d634a280b3eaadad082254";
  const hardwiredStation = data?.find(
    (station) => station.id === HARDWIRED_STATION_ID,
  );
  const terminals = hardwiredStation?.terminals || [];

  const content = (
    <div>
      <form action={handleDataRequest}>
        <DataSelector className={styles.dataSelector} terminals={terminals} />
        <button type="submit">Submit</button>
      </form>
    </div>
  );

  return (
    <div>
      <h1>Select</h1>
      {content}
    </div>
  );
}
