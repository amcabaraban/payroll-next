USE payroll_next;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'hr', 'employee') DEFAULT 'employee',
    department VARCHAR(50),
    position VARCHAR(50),
    salary DECIMAL(10,2) DEFAULT 0,
    phone VARCHAR(20),
    address TEXT,
    status TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO users (full_name, email, password, role, department, salary) VALUES
('Cabaraban, Arthur M.', 'arthur@gmail.com', 'Arthur@123', 'admin', 'IT', 50000),
('Admin User', 'admin@payroll.com', 'admin123', 'admin', 'Management', 100000),
('HR Manager', 'hr@payroll.com', 'hr123', 'hr', 'Human Resources', 40000),
('John Doe', 'john@payroll.com', 'john123', 'employee', 'Finance', 30000);