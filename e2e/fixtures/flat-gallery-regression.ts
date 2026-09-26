/** Frozen minimal reproduction of a33c3d0's global grid. Intrinsic contents isolate row coupling. */
export const flatGalleryRegression = `
<style>
  .old-gallery { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); align-items:start; gap:24px; }
  .old-gallery [data-wide] { grid-column:span 2; }
</style>
<div class="old-gallery">
  <section id="week" data-wide><div style="height:200px">Productive Week</div></section>
  <section id="profile"><div style="height:500px">Account Profile</div></section>
  <section id="team" data-wide><div style="height:180px">Team Access</div></section>
</div>`
