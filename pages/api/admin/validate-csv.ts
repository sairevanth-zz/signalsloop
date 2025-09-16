import { NextApiRequest, NextApiResponse } from 'next';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  rowCount: number;
  columnCount: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { csvText } = req.body;

    if (!csvText || typeof csvText !== 'string') {
      return res.status(400).json({ error: 'csvText is required' });
    }

    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      rowCount: 0,
      columnCount: 0
    };

    // Basic CSV validation
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      result.isValid = false;
      result.errors.push('CSV must have at least a header row and one data row');
      return res.status(200).json(result);
    }

    // Check headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    result.columnCount = headers.length;

    if (headers.length === 0) {
      result.isValid = false;
      result.errors.push('No columns found in header row');
      return res.status(200).json(result);
    }

    // Check for empty headers
    const emptyHeaders = headers.filter(h => !h.trim());
    if (emptyHeaders.length > 0) {
      result.warnings.push(`${emptyHeaders.length} empty column header(s) found`);
    }

    // Validate data rows
    const dataRows = lines.slice(1);
    result.rowCount = dataRows.length;

    if (result.rowCount > 1000) {
      result.warnings.push('Large file detected. Consider splitting into smaller batches.');
    }

    // Check for consistent column counts
    let inconsistentRows = 0;
    dataRows.forEach((line, index) => {
      const values = line.split(',');
      if (values.length !== headers.length) {
        inconsistentRows++;
      }
    });

    if (inconsistentRows > 0) {
      if (inconsistentRows > result.rowCount * 0.1) { // More than 10% inconsistent
        result.isValid = false;
        result.errors.push(`${inconsistentRows} rows have inconsistent column counts`);
      } else {
        result.warnings.push(`${inconsistentRows} rows have inconsistent column counts`);
      }
    }

    // Check for recommended columns
    const recommendedColumns = ['title', 'description', 'status'];
    const foundColumns = recommendedColumns.filter(col => 
      headers.some(h => h.toLowerCase().includes(col.toLowerCase()))
    );

    if (foundColumns.length === 0) {
      result.warnings.push('No recommended columns found (title, description, status)');
    }

    res.status(200).json(result);

  } catch (error) {
    console.error('CSV validation error:', error);
    res.status(500).json({ error: 'Failed to validate CSV' });
  }
}
