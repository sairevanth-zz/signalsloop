import { Review } from '../types';

export function parseCSV(csvContent: string): Review[] {
    try {
        const lines = csvContent.split('\n');
        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());

        // Simple header mapping
        const textIdx = headers.findIndex(h => h.includes('review') || h.includes('text') || h.includes('body'));
        const ratingIdx = headers.findIndex(h => h.includes('rating') || h.includes('score') || h.includes('stars'));
        const dateIdx = headers.findIndex(h => h.includes('date') || h.includes('time'));
        const authorIdx = headers.findIndex(h => h.includes('author') || h.includes('user') || h.includes('name'));

        if (textIdx === -1) {
            console.error('Could not find review text column in CSV');
            return [];
        }

        return lines.slice(1)
            .filter(line => line.trim().length > 0)
            .map(line => {
                // Handle quoted CSV fields partially (simple split, not robust for complex CSVs)
                // For production, use a library like PapaParse
                const values = line.split(',');

                const text = values[textIdx]?.replace(/^"|"$/g, '').trim();
                if (!text) return null;

                let rating = null;
                if (ratingIdx !== -1) {
                    const ratingVal = parseFloat(values[ratingIdx]?.replace(/^"|"$/g, ''));
                    if (!isNaN(ratingVal)) rating = ratingVal;
                }

                let date = null;
                if (dateIdx !== -1) {
                    const dateVal = new Date(values[dateIdx]?.replace(/^"|"$/g, ''));
                    if (!isNaN(dateVal.getTime())) date = dateVal;
                }

                const author = authorIdx !== -1 ? values[authorIdx]?.replace(/^"|"$/g, '').trim() : null;

                return {
                    text,
                    rating,
                    date: date || new Date(),
                    author: author || 'Anonymous',
                    source: 'csv_upload',
                    source_url: null
                } as Review;
            })
            .filter((r): r is Review => r !== null);

    } catch (error) {
        console.error('Error parsing CSV:', error);
        return [];
    }
}
