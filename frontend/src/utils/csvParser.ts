/**
 * Utility functions for parsing CSV files on the frontend
 */

export interface ParsedCSVData {
  headers: string[];
  rows: string[][];
  preview: string[][];
}

/**
 * Parse CSV file and extract headers and preview data
 */
export const parseCSVFile = (file: File): Promise<ParsedCSVData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length === 0) {
          reject(new Error('CSV file is empty'));
          return;
        }
        
        // Parse CSV manually (simple approach)
        const parseCSVLine = (line: string): string[] => {
          const result: string[] = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          
          result.push(current.trim());
          return result;
        };
        
        // Extract headers (first line)
        const headers = parseCSVLine(lines[0]);
        
        // Parse all rows
        const rows = lines.slice(1).map(line => parseCSVLine(line));
        
        // Create preview (first 5 rows)
        const preview = rows.slice(0, 5);
        
        resolve({
          headers,
          rows,
          preview
        });
        
      } catch (error) {
        reject(new Error(`Failed to parse CSV: ${error}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
};

/**
 * Validate that required columns exist in the CSV headers
 */
export const validateRequiredColumns = (
  headers: string[], 
  requiredFields: string[]
): { isValid: boolean; missingFields: string[] } => {
  const lowerHeaders = headers.map(h => h.toLowerCase());
  const missingFields = requiredFields.filter(field => 
    !lowerHeaders.includes(field.toLowerCase())
  );
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
};