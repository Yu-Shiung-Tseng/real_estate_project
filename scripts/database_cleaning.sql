CREATE OR REPLACE VIEW housing_data_clean AS
SELECT 
    id, township, transaction_sign,
    TO_DATE((CAST(SUBSTRING(LPAD(transaction_date, 7, '0'), 1, 3) AS INT) + 1911)::TEXT || 
            SUBSTRING(LPAD(transaction_date, 7, '0'), 4, 4), 'YYYYMMDD') AS transaction_western_date,
    ROUND(building_area * 0.3025, 2) AS building_pings,
    CASE WHEN building_area > 0 THEN ROUND(total_price / (building_area * 0.3025), 0) ELSE 0 END AS unit_price_per_ping,
    (note LIKE '%親友%' OR note LIKE '%員工%') AS is_special_transaction,
    building_state, total_price, year, season, case_type
FROM raw_housing_data
WHERE total_price > 0;
