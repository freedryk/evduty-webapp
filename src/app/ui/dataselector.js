'use client';

import { useState, useContext, useEffect } from 'react';
import Calendar from 'react-calendar';

import { TokenContext } from "@/app/ui/login.js";

import { get } from '@/app/lib/evduty_api.js';

import styles from "@/app/ui/page.module.css";

function TerminalSelector() {
    return (
        <div className={styles.terminalselector}>
            <select name='terminals' id='terminals' multiple>
                <option value='terminal1'>Terminal 1</option>
                <option value='terminal2'>Terminal 2</option>
                <option value='terminal3'>Terminal 3</option>
            </select>
        </div>
    )
}

function AveragingSelector() {
    return (
        <div className={styles.averagingselector}>
            <input type="radio" id="averaging" name="averaging" value="Monthly" />
            <label htmlFor="averaging">Monthly Averages</label>
            <input type="radio" id="averaging" name="averaging" value="Raw" />
            <label htmlFor="averaging">Raw Data</label>
            <input type="radio" id="averaging" name="averaging" value="Overall" />
            <label htmlFor="averaging">Overall Averages</label>
        </div>
    )
}

export default function DataSelector() {
    const { token, setToken } = useContext(TokenContext);

    return (
        <div>

                <TerminalSelector />
                <Calendar />
                <AveragingSelector />
        </div>           
    )
}