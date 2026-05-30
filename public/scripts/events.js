const filterButtons = Array.from(document.querySelectorAll('[data-event-filter]'));
const eventCards = Array.from(document.querySelectorAll('.event-card'));

function applyFilter(filter) {
  const terms = filter === 'all' ? [] : filter.split(/\s+/).filter(Boolean);
  eventCards.forEach((card) => {
    const haystack = card.dataset.filter || '';
    const visible = terms.length === 0 || terms.some((term) => haystack.includes(term));
    card.hidden = !visible;
  });
}

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    filterButtons.forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    applyFilter(button.dataset.eventFilter || 'all');
  });
});
