export async function preparePhoto(file){
  if(!file.type.startsWith("image/")||file.size>20*1024*1024)throw new Error("Välj en bild som är högst 20 MB.");
  const url=URL.createObjectURL(file);
  try{
    const image=new Image();image.src=url;
    await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error("Bilden kunde inte öppnas. Välj en JPG- eller PNG-bild."));});
    const scale=Math.min(1,640/Math.max(image.naturalWidth,image.naturalHeight));
    const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    const context=canvas.getContext("2d");context.fillStyle="#fff";context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
    return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Bilden kunde inte sparas.")),"image/jpeg",.85));
  }finally{URL.revokeObjectURL(url);}
}
