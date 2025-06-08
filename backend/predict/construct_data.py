from typing import List

import pandas as pd
from datetime import datetime
import uuid

from tqdm import tqdm

from shared_models.sensor_data_model import DataResponse

# Load CSV

# Mapping sensor types to units
sensor_units = {
    "temperature": "celsius",
    "humidity": "%",
    "pressure": "hPa",
    "lux": "lux"
}


# Prepare data
def construct_data(csv_file: str) -> List[DataResponse]:
    df = pd.read_csv(csv_file)
    data_responses = []

    for _, row in tqdm(df.iterrows()):
        try:
            timestamp = datetime.strptime(str(row['time']), "%Y/%m/%d %H:%M:%S")
        except ValueError:
            continue  # Skip malformed entries

        for sensor, unit in sensor_units.items():
            value = row[sensor]
            if sensor == "pressure":
                value = value / 100.0  # Convert Pa to hPa

            data = DataResponse(
                id=str(uuid.uuid4()),
                device_id="device_mock",
                sensor_type=sensor,
                value=float(value),
                unit=unit,
                timestamp=timestamp,
                location="test_room",
                latitude=0.0,
                longitude=0.0
            )
            data_responses.append(data)

    return data_responses
