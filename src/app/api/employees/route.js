import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/response';
import { getSession } from '@/lib/auth';

// GET - List all employees (including admin)
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';
        const role = searchParams.get('role') || '';
        const department = searchParams.get('department') || '';

        let sql = `
            SELECT u.*, d.name as department_name, des.name as position_name 
            FROM users u 
            LEFT JOIN departments d ON u.department = d.id 
            LEFT JOIN designations des ON u.position = des.id 
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            sql += ' AND (u.full_name LIKE ? OR u.email LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        if (role) {
            sql += ' AND u.role = ?';
            params.push(role);
        }

        if (department) {
            sql += ' AND u.department = ?';
            params.push(department);
        }

        sql += ' ORDER BY u.id DESC';

        const employees = await query(sql, params);
        return successResponse(employees);
    } catch (error) {
        return errorResponse('Failed to fetch employees: ' + error.message);
    }
}

// POST - Add new employee
export async function POST(request) {
    try {
        const data = await request.json();

        // Validate required fields
        if (!data.full_name || !data.email || !data.password) {
            return errorResponse('Name, email, and password are required');
        }

        // Check if email already exists
        const existing = await query(
            'SELECT id FROM users WHERE email = ?',
            [data.email]
        );
        if (existing.length > 0) {
            return errorResponse('Email already exists');
        }

        // Insert new employee
        const result = await query(
            `INSERT INTO users (full_name, email, password, role, department, position, salary, phone, address, leave_credits) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.full_name,
                data.email,
                data.password,
                data.role || 'employee',
                data.department || null,
                data.position || null,
                data.salary || 0,
                data.phone || null,
                data.address || null,
                data.leave_credits || 0,
                data.date_hired || null, data.employment_status || 'probationary',
            ]
            
        );

        return successResponse(
            { id: result.insertId },
            'Employee added successfully'
        );
    } catch (error) {
        console.error('Add employee error:', error);
        return errorResponse('Failed to add employee');
    }
}

// PUT - Update employee
export async function PUT(request) {
    try {
        const data = await request.json();
        const { id } = data;

        if (!id) return errorResponse('Employee ID is required');

        await query(
            `UPDATE users SET 
                full_name = ?, email = ?, role = ?, department = ?, position = ?, salary = ?, 
                phone = ?, address = ?, apply_tax = ?, salary_type = ?,
                sss = ?, philhealth_no = ?, tin = ?, pagibig_no = ?,
                birthday = ?, birthplace = ?, marital_status = ?, gender = ?,
                contact_no = ?, emergency_contact = ?,
                elementary = ?, elementary_year = ?, highschool = ?, highschool_year = ?,
                college = ?, college_year = ?, mother_name = ?, father_name = ?,
                spouse_name = ?, dependents = ?, skills = ?, date_hired = ?, employment_status = ?
            WHERE id = ?`,
            [  // ← DAGDAG ITO - comma after SQL string
                data.full_name, data.email, data.role, parseInt(data.department) || null, parseInt(data.position) || null, data.salary,
                data.phone, data.address, data.apply_tax, data.salary_type,
                data.sss || null, data.philhealth_no || null, data.tin || null, data.pagibig_no || null,
                data.birthday || null, data.birthplace || null, data.marital_status || null, data.gender || null,
                data.contact_no || null, data.emergency_contact || null,
                data.elementary || null, data.elementary_year || null, data.highschool || null, data.highschool_year || null,
                data.college || null, data.college_year || null, data.mother_name || null, data.father_name || null,
                data.spouse_name || null, data.dependents || null, data.skills || null,
                data.date_hired || null, data.employment_status || 'probationary',
                data.id
            ]
        );

        return successResponse(null, 'Employee updated successfully');
    } catch (error) {
        console.error('PUT error:', error);
        return errorResponse('Failed to update employee: ' + error.message);
    }
}

// DELETE - Remove employee
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return errorResponse('Employee ID is required');

        await query('DELETE FROM users WHERE id = ?', [id]);

        return successResponse(null, 'Employee deleted successfully');
    } catch (error) {
        return errorResponse('Failed to delete employee');
    }
}