import { apiRequest } from './api';

export interface DiaryEntry {
  id: string;
  user_id: string;
  crop_name: string;
  disease_name: string;
  confidence: number;
  image_url: string | null;
  notes: string;
  treatment_applied: string;
  observation_date: string;
  created_at: string;
}

export async function createDiaryEntry(entry: {
  crop_name: string;
  disease_name: string;
  confidence: number;
  image_url?: string;
  notes?: string;
  treatment_applied?: string;
  observation_date?: string;
}) {
  return apiRequest<DiaryEntry, typeof entry>('/api/diary', {
    method: 'POST',
    body: entry,
  });
}

export async function getDiaryEntries(limit?: number) {
  const params = new URLSearchParams();
  if (limit) params.set('limit', String(limit));
  const query = params.toString();
  const path = query ? `/api/diary?${query}` : '/api/diary';
  return apiRequest<DiaryEntry[], undefined>(path);
}

export async function updateDiaryEntry(
  entryId: string,
  updates: {
    notes?: string;
    treatment_applied?: string;
    observation_date?: string;
  }
) {
  return apiRequest<DiaryEntry, typeof updates>(`/api/diary/${entryId}`, {
    method: 'PATCH',
    body: updates,
  });
}

export async function deleteDiaryEntry(entryId: string) {
  await apiRequest<{ ok: boolean }, undefined>(`/api/diary/${entryId}`, {
    method: 'DELETE',
  });
}

export function exportDiaryToCSV(entries: DiaryEntry[]): string {
  const headers = [
    'Date',
    'Crop',
    'Disease',
    'Confidence (%)',
    'Notes',
    'Treatment Applied',
  ];

  const rows = entries.map((entry) => [
    entry.observation_date,
    entry.crop_name,
    entry.disease_name,
    entry.confidence.toString(),
    entry.notes.replace(/,/g, ';'),
    entry.treatment_applied.replace(/,/g, ';'),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  return csvContent;
}

export function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
