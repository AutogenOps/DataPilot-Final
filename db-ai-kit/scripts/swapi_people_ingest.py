import json
from typing import Dict, List, Optional
from urllib.request import Request, urlopen

from pyspark.sql import SparkSession


API_URL = "https://swapi.info/api/people"
TARGET_TABLE = "swapi_demo.raw_data.characters"


def fetch_json(url: str) -> object:
    req = Request(url, headers={"User-Agent": "databricks-swapi-job/1.0"})
    with urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def normalize_person(person: Dict[str, object]) -> Dict[str, Optional[str]]:
    return {
        "name": str(person.get("name")) if person.get("name") is not None else None,
        "height": str(person.get("height")) if person.get("height") is not None else None,
        "mass": str(person.get("mass")) if person.get("mass") is not None else None,
        "birth_year": str(person.get("birth_year")) if person.get("birth_year") is not None else None,
        "homeworld": str(person.get("homeworld")) if person.get("homeworld") is not None else None,
    }


def fetch_all_people(start_url: str) -> List[Dict[str, Optional[str]]]:
    all_rows: List[Dict[str, Optional[str]]] = []
    next_url: Optional[str] = start_url
    seen_urls = set()

    while next_url:
        if next_url in seen_urls:
            break
        seen_urls.add(next_url)

        payload = fetch_json(next_url)

        if isinstance(payload, list):
            all_rows.extend(normalize_person(p) for p in payload if isinstance(p, dict))
            break

        if isinstance(payload, dict):
            results = payload.get("results", [])
            if isinstance(results, list):
                all_rows.extend(normalize_person(p) for p in results if isinstance(p, dict))
            else:
                raise ValueError("Unexpected 'results' format in SWAPI response.")
            next_url = payload.get("next")
            if next_url is not None:
                next_url = str(next_url)
        else:
            raise ValueError("Unexpected SWAPI response type.")

    return all_rows


def main() -> None:
    spark = SparkSession.builder.getOrCreate()

    # Ensure target catalog/schema/table exists for first run.
    spark.sql("CREATE CATALOG IF NOT EXISTS swapi_demo")
    spark.sql("CREATE SCHEMA IF NOT EXISTS swapi_demo.raw_data")
    spark.sql(
        """
        CREATE TABLE IF NOT EXISTS swapi_demo.raw_data.characters (
          name STRING,
          height STRING,
          mass STRING,
          birth_year STRING,
          homeworld STRING
        )
        """
    )

    rows = fetch_all_people(API_URL)
    if not rows:
        raise RuntimeError("No character rows were returned from SWAPI.")

    df = spark.createDataFrame(rows).select(
        "name", "height", "mass", "birth_year", "homeworld"
    )

    # Replace contents each run to keep table aligned with current SWAPI snapshot.
    spark.sql(f"TRUNCATE TABLE {TARGET_TABLE}")
    df.createOrReplaceTempView("swapi_people_stage")
    spark.sql(
        f"""
        INSERT INTO {TARGET_TABLE} (name, height, mass, birth_year, homeworld)
        SELECT name, height, mass, birth_year, homeworld
        FROM swapi_people_stage
        """
    )

    print(f"Inserted {len(rows)} rows into {TARGET_TABLE}.")


if __name__ == "__main__":
    main()
