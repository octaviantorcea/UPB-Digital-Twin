import argparse
import json
import random
import math
from datetime import datetime, timedelta
from pathlib import Path


def parse_args():
    parser = argparse.ArgumentParser(description="Generate synthetic sensor data with seasonality.")
    parser.add_argument("config_path", type=Path, help="Path to sensor config JSON file.")
    parser.add_argument("output_path", type=Path, help="Path to output JSON file.")
    parser.add_argument("--start_date", required=True, help="Start date (e.g. 2025-03-01T00:00:00Z)")
    parser.add_argument("--end_date", required=True, help="End date (e.g. 2025-03-01T23:59:59Z)")
    parser.add_argument("--time_interval", type=int, required=True, help="Interval between samples in minutes.")
    return parser.parse_args()


def daily_seasonality(hour: float, sensor_type: str) -> float:
    """Base value based on hour of the day using sine function to simulate daily seasonality."""
    radians = (hour / 24) * 2 * math.pi  # full day cycle
    if sensor_type == "temperature":
        return 18 + 5 * math.sin(radians - math.pi / 2)  # 13°C at night, 23°C in afternoon
    elif sensor_type == "humidity":
        return 60 - 10 * math.sin(radians - math.pi / 2)  # more humid at night
    elif sensor_type == "pressure":
        return 1013 + 3 * math.sin(radians)
    elif sensor_type == "light":
        return max(0, 800 * math.sin(radians))  # 0 at night, peaks during day
    elif sensor_type == "sound":
        return 30 + 20 * abs(math.sin(radians))  # louder during daytime
    else:
        return 0


def get_value_generator(sensor_type: str):
    """Returns a closure that generates smoothed values for a sensor."""
    prev = None

    def generate(timestamp: datetime):
        nonlocal prev
        hour = timestamp.hour + timestamp.minute / 60
        base = daily_seasonality(hour, sensor_type)
        if prev is None:
            prev = base + random.uniform(-1, 1)
        else:
            # limit delta for realism
            max_change = {
                "temperature": 0.3,
                "humidity": 1.0,
                "pressure": 0.5,
                "light": 50,
                "sound": 2.0
            }.get(sensor_type, 0.5)
            trend = base - prev
            noise = random.uniform(-max_change, max_change)
            prev += trend * 0.1 + noise  # smooth toward seasonal base
        return round(prev, 2)

    return generate


def main():
    args = parse_args()

    with open(args.config_path, "r", encoding="utf-8") as f:
        sensor_config = json.load(f)

    start_dt = datetime.fromisoformat(args.start_date.replace("Z", "+00:00"))
    end_dt = datetime.fromisoformat(args.end_date.replace("Z", "+00:00"))
    interval = timedelta(minutes=args.time_interval)

    generators = {
        device["device_id"]: get_value_generator(device["sensor_type"])
        for device in sensor_config
    }

    current_time = start_dt
    output_data = []

    while current_time <= end_dt:
        timestamp_str = current_time.isoformat(timespec="seconds").replace("+00:00", "Z")
        for device in sensor_config:
            gen = generators[device["device_id"]]
            value = gen(current_time)
            entry = {
                "device_id": device["device_id"],
                "sensor_type": device["sensor_type"],
                "value": value,
                "unit": device["unit"],
                "timestamp": timestamp_str,
                "location": device["location"],
                "is_indoor": device["is_indoor"],
                "latitude": round(random.uniform(40.7120, 40.7135), 4),
                "longitude": round(random.uniform(-74.0070, -74.0050), 4),
                "floor": device["floor"]
            }
            output_data.append(entry)
        current_time += interval

    with open(args.output_path, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    print(f"Generated {len(output_data)} entries in '{args.output_path}'.")


if __name__ == "__main__":
    main()
