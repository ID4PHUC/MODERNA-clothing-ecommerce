document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('footer-container');
  if(!container) return;
  
  const res = await fetch('footer.html');
  if(res.ok){
    const html = await res.text();
    container.innerHTML = html;
  } else {
    console.error('Không load được footer');
  }
});