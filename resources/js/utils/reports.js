import api from '../api/axios';

async function extractError(error) {
  if (error.response?.data instanceof Blob) {
    const text = await error.response.data.text();
    try {
      return JSON.parse(text).message || 'Report generation failed.';
    } catch {
      return 'Report generation failed.';
    }
  }
  return error.response?.data?.message || 'Report generation failed.';
}

export async function generateEventReport(eventId, { preview = false } = {}) {
  try {
    const response = await api.get(`/staff/reports/event/${eventId}`, {
      params: { format: 'pdf', ...(preview ? { preview: 1 } : {}) },
      responseType: 'blob',
    });

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;

    if (preview) {
      link.target = '_blank';
      link.rel = 'noopener';
    } else {
      link.download = `event-summary-${eventId}.pdf`;
    }

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.setTimeout(() => window.URL.revokeObjectURL(url), preview ? 60000 : 2000);

    return { ok: true };
  } catch (error) {
    return { ok: false, message: await extractError(error) };
  }
}