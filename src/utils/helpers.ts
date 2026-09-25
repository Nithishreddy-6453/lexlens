/**
 * Helper utilities for LexLens
 */

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

export function getSeverityBadgeColor(severity: string): { bg: string; text: string; border: string } {
  switch (severity?.toLowerCase()) {
    case 'high':
      return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' };
    case 'medium':
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
    case 'low':
    default:
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
  }
}

export function getImpactColor(impact: string): { bg: string; text: string; label: string } {
  switch (impact) {
    case 'favorable_to_doc2':
      return { bg: 'bg-emerald-100 text-emerald-800', text: 'text-emerald-700', label: 'Favorable to Amendment' };
    case 'favorable_to_doc1':
      return { bg: 'bg-indigo-100 text-indigo-800', text: 'text-indigo-700', label: 'Favorable to Original' };
    case 'material_risk':
      return { bg: 'bg-rose-100 text-rose-800', text: 'text-rose-700', label: 'Material Risk Shift' };
    default:
      return { bg: 'bg-slate-100 text-slate-800', text: 'text-slate-600', label: 'Neutral / Clarification' };
  }
}
