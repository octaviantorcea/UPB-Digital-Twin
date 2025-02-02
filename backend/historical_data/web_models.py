from enum import Enum


class AggrPeriod(str, Enum):
    DAILY = 'daily'
    WEEKLY = 'weekly'
    SEASONAL = 'seasonal'


class AggregationMethod(str, Enum):
    MEAN = 'mean'
    MIN = 'min'
    MAX = 'max'
    MEDIAN = 'median'
    STD = 'std'
    COUNT = 'count'
    ROLLING_MEAN = 'rolling_mean'


class DataFormat(str, Enum):
    CSV = "csv"
    JSON = "json"


class SensorType(str, Enum):
    TEMPERATURE = "temperature"
    HUMIDITY = "humidity"
    PRESSURE = "pressure"
