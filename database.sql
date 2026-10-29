-- ============================================================
-- CU LaptopLoop Database Script (Basic MySQL)
-- Database: cu_laptoploop
-- ============================================================

CREATE DATABASE IF NOT EXISTS cu_laptoploop;
USE cu_laptoploop;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    uid VARCHAR(30) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,
    department VARCHAR(100) DEFAULT 'Computer Science & Engineering',
    phone VARCHAR(20) DEFAULT '+91 98765 43210'
);

-- 2. Laptops Table
CREATE TABLE IF NOT EXISTS laptops (
    laptop_id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    brand VARCHAR(50) NOT NULL,
    model VARCHAR(150) NOT NULL,
    specs VARCHAR(255) NOT NULL,
    description TEXT,
    price_per_day DECIMAL(10,2) NOT NULL,
    pickup_location VARCHAR(150) NOT NULL,
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (owner_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 3. Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    laptop_id INT NOT NULL,
    renter_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INT NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'RETURNED', 'CANCELLED') DEFAULT 'PENDING',
    FOREIGN KEY (laptop_id) REFERENCES laptops(laptop_id) ON DELETE CASCADE,
    FOREIGN KEY (renter_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 4. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_status ENUM('PENDING', 'PAID', 'REFUNDED') DEFAULT 'PENDING',
    transaction_id VARCHAR(100) DEFAULT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE
);

-- ============================================================
-- Sample Data for Demo & Evaluation (Password: Password@123)
-- ============================================================

INSERT INTO users (user_id, name, uid, email, password, department, phone) VALUES
(1, 'Aarav Sharma', '21BCS1014', 'aarav@cuchd.in', 'Password@123', 'Computer Science & Engineering', '+91 98765 43210'),
(2, 'Riya Patel', '22BCS2048', 'riya@cuchd.in', 'Password@123', 'Information Technology', '+91 98123 45678'),
(3, 'Kabir Singh', '21BIT3092', 'kabir@cuchd.in', 'Password@123', 'AI & Data Science', '+91 97234 56789')
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO laptops (laptop_id, owner_id, brand, model, specs, description, price_per_day, pickup_location, image_url, is_active) VALUES
(1, 1, 'Apple', 'MacBook Pro 14" (M2 Pro)', '16GB RAM, 512GB SSD, M2 Pro 16-Core GPU', 'Excellent machine for iOS development, Flutter, and heavy compilation.', 650.00, 'Academic Block 1 (A1) - Room 302', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80', TRUE),
(2, 1, 'Dell', 'Dell XPS 15 OLED', '32GB DDR5, 1TB SSD, RTX 3050 Ti', 'Top-tier workstation with 3.5K OLED screen for machine learning and Android Studio.', 550.00, 'Central Library - Ground Floor', 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=800&q=80', TRUE),
(3, 2, 'Lenovo', 'Lenovo Legion 5 Pro', '16GB RAM, 1TB SSD, RTX 3060 6GB (130W)', 'High TGP gaming and 3D rendering machine for Blender and game jams.', 500.00, 'Hostel Block NC-3 Reception', 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=800&q=80', TRUE),
(4, 2, 'ASUS', 'ROG Zephyrus G14', '16GB DDR5, 1TB SSD, Radeon RX 6700S', 'Compact powerhouse with 120Hz display, great for hackathons.', 600.00, 'Student Center / Food Street', 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80', TRUE),
(5, 3, 'HP', 'HP Pavilion Aero 13', '16GB RAM, 512GB SSD, Ryzen 5 5600U', 'Weighs under 1kg, 10-hour battery life for library study marathons.', 320.00, 'Academic Block 3 (BioTech Gate)', 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=800&q=80', TRUE)
ON DUPLICATE KEY UPDATE model=VALUES(model);

INSERT INTO bookings (booking_id, laptop_id, renter_id, start_date, end_date, total_days, total_price, status) VALUES
(1, 1, 2, CURDATE() + INTERVAL 2 DAY, CURDATE() + INTERVAL 5 DAY, 3, 1950.00, 'APPROVED'),
(2, 2, 3, CURDATE() + INTERVAL 3 DAY, CURDATE() + INTERVAL 6 DAY, 3, 1650.00, 'PENDING')
ON DUPLICATE KEY UPDATE status=VALUES(status);

INSERT INTO payments (payment_id, booking_id, amount, payment_status, transaction_id) VALUES
(1, 1, 1950.00, 'PAID', 'TXN_CU_9823487192')
ON DUPLICATE KEY UPDATE payment_status=VALUES(payment_status);
