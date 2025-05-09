'use client';

import { useState, useContext, useEffect } from 'react';

import { TokenContext } from "@/app/ui/login.js";

import { get } from '@/app/lib/evduty_api.js';

import styles from "@/app/ui/page.module.css";


function Terminal({ terminal }) {
    console.log("terminal:", JSON.stringify(terminal));
    return (
        <div className={styles.terminal} >
            <ul>
                {['name', 'id', 'status'].map((item, index) => (
                    <li key={index}>
                        {`${item}: ${terminal[item]}`} 
                    </li>
                ))}
            </ul>
        </div>
    )
}

function Station({ station }) {
    console.log("station:", JSON.stringify(station, null, 2));

    return (
        <div className={styles.station} >
            <h2>{station.name}</h2>
                {station.terminals.map((terminal) => (
                    <Terminal terminal={terminal} />
                ))}
        </div>
    )
}

export default function MainMenu() {
    const [data, setData] = useState(null);

    const { token, setToken } = useContext(TokenContext);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await get(token.accessToken, 'v1/account/stations');
                const data = await response.json();
                setData(data);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };
        fetchData();
    }, [token]);

    console.log("data:", JSON.stringify(data));

    return (
        <div>
            <h1>Main Menu</h1>
            {data
                ? data.map((item, index) => (<Station key={index} station={item} className={styles.station}/>))
                : <p>Loading...</p>}
            <button onClick={() => setData(Math.random())}>reset</button>
        </div>
    )
};
