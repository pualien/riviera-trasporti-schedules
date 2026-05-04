export function renderEmptyState(message = 'No direct buses found for that exact stop pair on the selected day type.') {
  return `
    <section class="empty-state">
      <p class="eyebrow">No Direct Route</p>
      <h2>${message}</h2>
      <p>Try another exact stop in the same area, or choose a different origin stop.</p>
    </section>
  `;
}
