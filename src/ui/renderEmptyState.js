export function renderEmptyState(message) {
  return `
    <section class="empty-state">
      <p class="eyebrow">No direct match</p>
      <h2>Route not available in the current direct index.</h2>
      <p>${message}</p>
    </section>
  `;
}
