import { query, getRow } from '@/lib/db';

export async function GET() {
    try {
        const settings = await getRow('SELECT * FROM company_settings ORDER BY id DESC LIMIT 1');
        
        if (!settings) {
            return Response.json({ 
                success: true, 
                data: {
                    company_name: '',
                    address: '',
                    contact_no: '',
                    email: '',
                    website: '',
                    tin: '',
                    sss_no: '',
                    philhealth_no: '',
                    pagibig_no: ''
                }
            });
        }
        
        return Response.json({ success: true, data: settings });
    } catch (error) {
        console.error('GET company-settings error:', error);
        return Response.json({ success: false, message: 'Failed to fetch company settings' }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const data = await request.json();
        console.log('Received data:', data);
        
        const existing = await getRow('SELECT id FROM company_settings LIMIT 1');
        
        if (existing) {
            await query(
                `UPDATE company_settings SET 
                    company_name = ?, address = ?, contact_no = ?, email = ?, 
                    website = ?, tin = ?, sss_no = ?, 
                    philhealth_no = ?, pagibig_no = ?
                WHERE id = ?`,
                [data.company_name || '', data.address || '', data.contact_no || '', data.email || '', 
                 data.website || '', data.tin || '', data.sss_no || '', 
                 data.philhealth_no || '', data.pagibig_no || '', existing.id]
            );
        } else {
            await query(
                `INSERT INTO company_settings 
                (company_name, address, contact_no, email, website, tin, sss_no, philhealth_no, pagibig_no) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [data.company_name || '', data.address || '', data.contact_no || '', data.email || '', 
                 data.website || '', data.tin || '', data.sss_no || '', 
                 data.philhealth_no || '', data.pagibig_no || '']
            );
        }
        
        return Response.json({ success: true, message: 'Settings saved' });
    } catch (error) {
        console.error('PUT company-settings error:', error);
        return Response.json({ success: false, message: 'Failed to save settings: ' + error.message }, { status: 500 });
    }
}