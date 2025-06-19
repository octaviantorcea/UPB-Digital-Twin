from typing import List
import pandas as pd
from datetime import datetime
import uuid
from tqdm import tqdm
from shared_models.sensor_data_model import DataResponse

# Mapping columns to internal sensor names and units
column_sensor_map = {
    "Temp": ("temperature", "celsius"),
    "Humid": ("humidity", "%"),
    "Pressure": ("pressure", "hPa"),
    # "OFFC_avg_value": ("lux", "lux"),  # Uncomment if lux is needed
}


def construct_data_two(csv_file: str) -> List[DataResponse]:
    df = pd.read_csv(csv_file)
    data_responses = []

    for _, row in tqdm(df.iterrows(), total=len(df)):
        try:
            timestamp = datetime.strptime(str(row['Time']), "%Y-%m-%d %H:%M:%S")
        except ValueError:
            continue  # Skip malformed entries

        for col_name, (sensor, unit) in column_sensor_map.items():
            try:
                value = float(row[col_name])
                if sensor == "pressure":
                    value = value  # Already in hPa
                data = DataResponse(
                    id=str(uuid.uuid4()),
                    device_id="device_mock",
                    sensor_type=sensor,
                    value=value,
                    unit=unit,
                    timestamp=timestamp,
                    location="test_room",
                    latitude=0.0,
                    longitude=0.0
                )
                data_responses.append(data)
            except (ValueError, KeyError):
                continue  # Skip missing/malformed sensor values

    return data_responses
