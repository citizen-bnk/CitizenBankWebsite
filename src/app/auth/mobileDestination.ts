/** A chosen workflow or Internet Banking destination takes precedence over the default. */
export function mobileLoginDestination(next:string,userAgent:string,touchPoints=0){
 const mobile=/Android|iPhone|iPad|iPod/i.test(userAgent)||(/Macintosh/i.test(userAgent)&&touchPoints>1);
 return mobile&&next==='/'?'/enter-app':next;
}
