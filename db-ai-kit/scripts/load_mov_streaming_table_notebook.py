# Databricks notebook source
# MAGIC %md
# MAGIC # Load Layer Streaming Table (PySpark)
# MAGIC
# MAGIC This notebook creates/refreshes the silver streaming table in:
# MAGIC - `watch_mov.load_mov.movies_mid`
# MAGIC
# MAGIC Source table:
# MAGIC - `watch_mov.new_mov.movies`

# COMMAND ----------

from pyspark.sql import SparkSession

spark = SparkSession.builder.getOrCreate()

CATALOG = "watch_mov"
SOURCE_SCHEMA = "new_mov"
LOAD_SCHEMA = "load_mov"
SOURCE_TABLE = f"{CATALOG}.{SOURCE_SCHEMA}.movies"
LOAD_STREAMING_TABLE = f"{CATALOG}.{LOAD_SCHEMA}.movies_mid"

print(f"Source: {SOURCE_TABLE}")
print(f"Target streaming table: {LOAD_STREAMING_TABLE}")

# COMMAND ----------

# Ensure destination schema exists.
spark.sql(f"CREATE SCHEMA IF NOT EXISTS {CATALOG}.{LOAD_SCHEMA}")

# Create or refresh streaming table in load (silver) layer.
spark.sql(
    f"""
    CREATE OR REFRESH STREAMING TABLE {LOAD_STREAMING_TABLE}
    AS
    SELECT
      movie_id,
      trim(title) AS title,
      release_year,
      genre,
      director,
      lead_actors,
      duration_minutes,
      language,
      country,
      imdb_rating,
      box_office_usd,
      is_available,
      created_at
    FROM STREAM({SOURCE_TABLE})
    """
)

print(f"Streaming table created/refreshed: {LOAD_STREAMING_TABLE}")

# COMMAND ----------

# Quick validation preview.
display(
    spark.sql(
        f"""
        SELECT movie_id, title, release_year, genre, director, imdb_rating, is_available
        FROM {LOAD_STREAMING_TABLE}
        ORDER BY movie_id
        LIMIT 20
        """
    )
)
