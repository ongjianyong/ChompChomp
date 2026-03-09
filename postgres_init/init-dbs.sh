#!/bin/bash
set -e

# Create individual databases and users for each microservice to enforce the Schema-per-Service pattern

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE USER inventory_user WITH PASSWORD 'inventory_pass';
    CREATE DATABASE inventory_db OWNER inventory_user;

    CREATE USER order_user WITH PASSWORD 'order_pass';
    CREATE DATABASE order_db OWNER order_user;

    CREATE USER logistics_user WITH PASSWORD 'logistics_pass';
    CREATE DATABASE logistics_db OWNER logistics_user;

    CREATE USER user_user WITH PASSWORD 'user_pass';
    CREATE DATABASE user_db OWNER user_user;
EOSQL
