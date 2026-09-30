/* The title as the game's menu sets it: the "&" straight under the crest's
   pike (the middle of the crest picture), and the banner centred on the
   letters themselves, padded evenly either side of their ink. "Crown" is
   wider than "Crypt", so the banner sits a little left of the pike. Without
   this script the title is simply centred. */
(function(){
  const ribbon = document.querySelector(".ribbon"), crest = document.querySelector(".crest");
  if(!ribbon || !crest){ if(ribbon) ribbon.classList.add("placed"); return; }
  const t = ribbon.querySelector(".t"), c = ribbon.querySelector(".c"), a = ribbon.querySelector(".a"), y = ribbon.querySelector(".y");
  const ctx = document.createElement("canvas").getContext("2d");
  const ink = (el, text) => {
    const cs = getComputedStyle(el);
    ctx.font = cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
    const m = ctx.measureText(text), sp = parseFloat(cs.letterSpacing) || 0;
    /* from the box's left edge: where the ink starts and ends */
    return {from: -m.actualBoundingBoxLeft, to: m.actualBoundingBoxRight, width: m.width + sp * text.length};
  };
  function fit(){
    ribbon.style.transform = ""; ribbon.style.paddingLeft = ribbon.style.paddingRight = "";
    const pad = parseFloat(getComputedStyle(ribbon).paddingLeft);
    const ic = ink(c, c.textContent), iy = ink(y, y.textContent);
    /* blank space inside the text box before the first letter's ink and after the last's */
    const before = ic.from, after = y.getBoundingClientRect().width - iy.to;
    ribbon.style.paddingLeft = Math.max(4, pad - before) + "px";
    ribbon.style.paddingRight = Math.max(4, pad - after) + "px";
    const ia = ink(a, a.textContent), ab = a.getBoundingClientRect(), cb = crest.getBoundingClientRect();
    const amp = ab.left + (ia.from + ia.to) / 2, pike = cb.left + cb.width / 2;
    ribbon.style.transform = "translateX(" + (pike - amp).toFixed(1) + "px)";
  }
  /* shown only once placed, so it never jumps; a font that never comes
     still lets it show after a moment */
  let shown = false;
  const show = () => { if(shown) return; shown = true; fit(); ribbon.classList.add("placed"); };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(show);
  setTimeout(show, 1500);
  addEventListener("resize", fit);
})();
