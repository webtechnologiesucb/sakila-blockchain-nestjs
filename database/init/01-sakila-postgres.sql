-- =============================================================
-- Sakila Schema & Seed Data for PostgreSQL
-- =============================================================

CREATE TABLE IF NOT EXISTS customer (
    customer_id SERIAL PRIMARY KEY,
    store_id INT NOT NULL DEFAULT 1,
    first_name VARCHAR(45) NOT NULL,
    last_name VARCHAR(45) NOT NULL,
    email VARCHAR(50) DEFAULT NULL,
    address_id INT DEFAULT 1,
    activebool BOOLEAN NOT NULL DEFAULT TRUE,
    create_date DATE NOT NULL DEFAULT CURRENT_DATE,
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active INT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS staff (
    staff_id SERIAL PRIMARY KEY,
    first_name VARCHAR(45) NOT NULL,
    last_name VARCHAR(45) NOT NULL,
    address_id INT DEFAULT 1,
    email VARCHAR(50) DEFAULT NULL,
    store_id INT NOT NULL DEFAULT 1,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    username VARCHAR(16) NOT NULL,
    password VARCHAR(40) DEFAULT NULL,
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS film (
    film_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    release_year INT,
    rental_duration SMALLINT NOT NULL DEFAULT 3,
    rental_rate NUMERIC(4,2) NOT NULL DEFAULT 4.99,
    length SMALLINT,
    replacement_cost NUMERIC(5,2) NOT NULL DEFAULT 19.99,
    rating VARCHAR(10) DEFAULT 'G',
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rental (
    rental_id SERIAL PRIMARY KEY,
    rental_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    inventory_id INT NOT NULL DEFAULT 1,
    customer_id INT NOT NULL,
    return_date TIMESTAMP DEFAULT NULL,
    staff_id INT NOT NULL,
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rental_customer FOREIGN KEY (customer_id) REFERENCES customer(customer_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_rental_staff FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS payment (
    payment_id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    staff_id INT NOT NULL,
    rental_id INT DEFAULT NULL,
    amount NUMERIC(5,2) NOT NULL,
    payment_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payment_customer FOREIGN KEY (customer_id) REFERENCES customer(customer_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_payment_staff FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_payment_rental FOREIGN KEY (rental_id) REFERENCES rental(rental_id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Seed Staff
INSERT INTO staff (staff_id, first_name, last_name, email, store_id, active, username) VALUES
(1, 'Mike', 'Hillyer', 'Mike.Hillyer@sakilastaff.com', 1, TRUE, 'Mike'),
(2, 'Jon', 'Stephens', 'Jon.Stephens@sakilastaff.com', 2, TRUE, 'Jon')
ON CONFLICT (staff_id) DO NOTHING;

-- Seed Customers
INSERT INTO customer (customer_id, store_id, first_name, last_name, email, activebool) VALUES
(1, 1, 'Mary', 'Smith', 'mary.smith@sakilacustomer.org', TRUE),
(2, 1, 'Patricia', 'Johnson', 'patricia.johnson@sakilacustomer.org', TRUE),
(3, 1, 'Linda', 'Williams', 'linda.williams@sakilacustomer.org', TRUE),
(4, 2, 'Barbara', 'Jones', 'barbara.jones@sakilacustomer.org', TRUE),
(5, 1, 'Elizabeth', 'Brown', 'elizabeth.brown@sakilacustomer.org', TRUE),
(6, 2, 'Jennifer', 'Davis', 'jennifer.davis@sakilacustomer.org', TRUE),
(7, 1, 'Maria', 'Miller', 'maria.miller@sakilacustomer.org', TRUE),
(8, 2, 'Susan', 'Wilson', 'susan.wilson@sakilacustomer.org', TRUE),
(9, 1, 'Margaret', 'Moore', 'margaret.moore@sakilacustomer.org', TRUE),
(10, 2, 'Dorothy', 'Taylor', 'dorothy.taylor@sakilacustomer.org', TRUE)
ON CONFLICT (customer_id) DO NOTHING;

-- Seed Films
INSERT INTO film (film_id, title, description, release_year, rental_duration, rental_rate) VALUES
(1, 'ACADEMY DINOSAUR', 'A Epic Drama of a Feminist And a Mad Scientist who must Battle a Teacher in The Canadian Rockies', 2006, 6, 0.99),
(2, 'ACE GOLDFINGER', 'A Astounding Epistle of a Database Administrator And a Explorer who must Find a Car in Ancient China', 2006, 3, 4.99),
(3, 'ADAPTATION HOLES', 'A Astounding Reflection of a Lumberjack And a Car who must Sink a Lumberjack in A Baloon', 2006, 7, 2.99),
(4, 'AFFAIR PREJUDICE', 'A Fanciful Documentary of a Frisbee And a Lumberjack who must Chase a Monkey in A Shark Tank', 2006, 5, 2.99),
(5, 'AFRICAN EGG', 'A Fast-Paced Documentary of a Pastry Chef And a Dentist who must Pursue a Forensic Psychologist in The Gulf of Mexico', 2006, 6, 2.99)
ON CONFLICT (film_id) DO NOTHING;

-- Seed Rentals
INSERT INTO rental (rental_id, rental_date, inventory_id, customer_id, return_date, staff_id) VALUES
(1, '2024-05-24 22:53:30', 1, 1, '2024-05-26 22:04:30', 1),
(2, '2024-05-24 22:54:33', 2, 2, '2024-05-28 19:40:33', 1),
(3, '2024-05-24 23:03:39', 3, 3, '2024-06-01 22:12:39', 1),
(4, '2024-05-24 23:04:41', 4, 4, '2024-06-03 01:43:41', 2),
(5, '2024-05-24 23:05:21', 5, 5, '2024-06-02 04:33:21', 1)
ON CONFLICT (rental_id) DO NOTHING;

-- Seed Initial Payments
INSERT INTO payment (payment_id, customer_id, staff_id, rental_id, amount, payment_date) VALUES
(1, 1, 1, 1, 2.99, '2024-05-25 04:44:07'),
(2, 1, 1, 1, 0.99, '2024-05-28 10:35:23'),
(3, 2, 1, 2, 5.99, '2024-05-27 00:02:07'),
(4, 3, 1, 3, 0.99, '2024-05-29 01:58:34'),
(5, 4, 2, 4, 9.99, '2024-05-30 03:21:20')
ON CONFLICT (payment_id) DO NOTHING;

-- Reset Sequences
SELECT setval('customer_customer_id_seq', (SELECT MAX(customer_id) FROM customer));
SELECT setval('staff_staff_id_seq', (SELECT MAX(staff_id) FROM staff));
SELECT setval('film_film_id_seq', (SELECT MAX(film_id) FROM film));
SELECT setval('rental_rental_id_seq', (SELECT MAX(rental_id) FROM rental));
SELECT setval('payment_payment_id_seq', (SELECT MAX(payment_id) FROM payment));
