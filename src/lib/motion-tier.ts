/**
 * Which motion a device gets.
 *
 * Three tiers, decided in the browser before the first paint:
 *
 *   none      nothing moves. A cheap phone, or someone who asked for less motion.
 *   standard  the CSS-only pass: staggered entrance, scroll reveals, a drawn line.
 *   full      everything, plus a drifting gradient mesh, word-by-word headline,
 *             parallax depth and richer reveals.
 *
 * `standard` is the server-rendered default, and that matters twice over. It is
 * what a visitor with JavaScript disabled keeps, and it is what React restores
 * on the Strict Mode remount in development — which wipes attributes the inline
 * script set on `<html>`. Both land on the tier that was already measured as
 * free, rather than on nothing or on the expensive one.
 */
export type MotionTier = 'none' | 'standard' | 'full'

export const DEFAULT_MOTION_TIER: MotionTier = 'standard'

/**
 * The detection, as a string, because it has to run as an inline script during
 * HTML parsing — before the browser paints and long before React exists. An
 * effect would be too late: on a slow connection the page is painted well before
 * hydration, which is exactly the audience this is for.
 *
 * Deliberately NOT read from request headers. Client hints could tell the server
 * the device memory, but reading headers in the root layout opts the whole app
 * out of static prerendering — and a statically served landing page is worth
 * more to a patient on a slow connection than a perfectly-chosen animation tier.
 *
 * What each signal means:
 *
 * - `prefers-reduced-motion` wins outright. It is a stated preference, not a
 *   guess about hardware, and it is the only signal here that is about a person
 *   rather than a device.
 * - `saveData` is likewise explicit: someone who turned on a data saver is
 *   telling us they are on a constrained connection or plan. Motion costs them
 *   nothing in bytes, but it is the clearest "give me the light version" signal
 *   a browser sends, and honouring it is cheap.
 * - `deviceMemory` is capped at 8 by spec to limit fingerprinting, so `>= 8`
 *   means "8GB or more" and is a genuinely capable device. `<= 2` is the cheap
 *   Android this whole project is designed around.
 * - `hardwareConcurrency` alone is a weak signal on Android, where mid-range
 *   chips report eight cores of which four are small. It only promotes a device
 *   in combination with memory.
 * - Safari and Firefox do not implement `deviceMemory`, so nothing promotes them
 *   on hardware alone; the second clause lets a desktop through on cores plus a
 *   fine pointer. Anything unrecognised stays at `standard`, which is the point
 *   of choosing the free tier as the default rather than the expensive one.
 *
 * `?motion=none|standard|full` overrides everything, so a tier can be seen on a
 * real phone rather than inferred. It only ever matches those three literals.
 */
export const MOTION_TIER_SCRIPT = `(function(){try{
var d=document.documentElement,q=location.search.match(/[?&]motion=(none|standard|full)\\b/);
if(q){d.dataset.motion=q[1];return}
if(matchMedia('(prefers-reduced-motion: reduce)').matches){d.dataset.motion='none';return}
var c=navigator.connection||{},m=navigator.deviceMemory,p=navigator.hardwareConcurrency;
if(c.saveData===true||(m&&m<=2)||(p&&p<=4)){d.dataset.motion='none';return}
if((m>=8&&p>=8)||(m===undefined&&p>=8&&matchMedia('(pointer: fine)').matches)){d.dataset.motion='full'}
}catch(e){}})()`
  .replace(/\n/g, '')
