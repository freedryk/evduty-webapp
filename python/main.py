import getpass
import json
import pprint

import pandas as pd
import requests


REQUEST_TIMEOUT = 30
GST = 1.05


def call_api(token, endpoint, query_params=None):
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json;charset=UTF-8",
        "Authorization": f"Bearer {token}",
    }

    base_url = "https://api.evduty.net/"
    try:
        r = requests.get(
            f"{base_url}{endpoint}",
            headers=headers,
            timeout=REQUEST_TIMEOUT,
            params=query_params,
        )
        r.raise_for_status()
    except requests.exceptions.HTTPError as err:
        raise err

    return r.json()


def login():
    email = input("Enter your email: ")
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

    try:
        response = requests.post(
            "https://api.evduty.net/v1/account/login",
            json=post_data,
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
    except requests.exceptions.HTTPError as err:
        raise err

    response = json.loads(response.text)
    token = response["accessToken"]
    token_ttl = response["expiresIn"]

    return token


def extract_energy_consumed(data):
    data = pd.DataFrame(data)
    print(data)
    # data["date"] = pd.to_datetime(data["date"], unit="s").dt.floor("D")
    data["date"] = pd.to_datetime(data["date"], unit="s")
    data["energyConsumed"] = data["energyConsumed"] / 1000.0

    # data = data.groupby(["date"])["energyConsumed",].sum()

    # data = data.reset_index()

    data["rate"] = 0.0975

    mask = data["date"] >= "2024-04-01"
    mask &= data["date"] < "2025-04-01"
    data.loc[mask, "rate"] = 0.1044

    mask = data["date"] >= "2025-04-01"
    mask &= data["date"] < "2026-04-01"
    data.loc[mask, "rate"] = 0.1119

    mask = data["date"] >= "2026-04-01"
    data.loc[mask, "rate"] = 0.1169

    data["cost"] = data["energyConsumed"] * data["rate"] * GST

    return data


def get_activity(token, station_id, terminal_id, limit=20):
    offset = 0
    result = []
    while True:
        r = call_api(
            token,
            f"v2/account/stations/{station_id}/terminals/{terminal_id}/activities",
            query_params={"limit": limit, "offset": offset},
        )

        data = r["data"]

        if data:
            data = extract_energy_consumed(r["data"])
            result.append(data)

        if len(r["data"]) < limit:
            break

        offset += limit

    if result:
        result = pd.concat(result)
        result = result.reset_index()
        result = result.sort_values(by="date")
        # result = result.set_index("date")
        # result = result.resample("MS").agg(
        #     {"energyConsumed": "sum", "cost": "sum", "rate": "mean"}
        # )

    return result


def main():
    token = login()

    [station] = call_api(token, "v1/account/stations")

    terminals = station["terminals"]

    pprint.pprint(terminals)

    result = []
    for terminal in terminals:
        print(terminal["id"], terminal["name"])

        activity = get_activity(token, station["id"], terminal["id"], limit=100)
        if not isinstance(activity, list):
            activity["name"] = terminal["name"]
            activity["id"] = terminal["id"]
            result.append(activity)
    result = pd.concat(result)

    for group, df in result.groupby("name"):
        print(group)
        print(df)

    # result.to_csv("activity.csv")
    result.to_parquet("activity.parquet")


if __name__ == "__main__":
    main()
