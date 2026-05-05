CREATE TABLE IF NOT EXISTS raw_housing_data (
    id SERIAL PRIMARY KEY,
    township TEXT, transaction_sign TEXT, address TEXT, land_area NUMERIC,
    zoning TEXT, non_metropolis_zoning TEXT, non_metropolis_usage TEXT,
    transaction_date TEXT, transaction_pen_number TEXT, shifting_level TEXT,
    total_floor_number TEXT, building_state TEXT, main_use TEXT,
    main_building_materials TEXT, construction_date TEXT, building_area NUMERIC,
    room_count INT, hall_count INT, bath_count INT, compartment_count TEXT,
    has_management TEXT, total_price NUMERIC, unit_price NUMERIC,
    berth_category TEXT, berth_area NUMERIC, berth_price NUMERIC,
    note TEXT, serial_number TEXT UNIQUE, main_building_area NUMERIC,
    aux_building_area NUMERIC, balcony_area NUMERIC, has_elevator TEXT,
    transaction_id TEXT, year INT, season INT, case_type TEXT,
    project_name TEXT, unit_number TEXT, cancel_status TEXT
);
