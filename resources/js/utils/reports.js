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

/**
 * Training analysis report — step failure rates across a date range.
 *
 * Both `from` and `to` are optional. The controller uses ->when() on
 * each, so omitting them returns all-time data rather than an empty set.
 */
export async function generateStepAnalysisReport({ from = null, to = null, preview = false } = {}) {
  try {
    const response = await api.get('/staff/reports/steps', {
      params: {
        format: 'pdf',
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        ...(preview ? { preview: 1 } : {}),
      },
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
      link.download = 'training-analysis.pdf';
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