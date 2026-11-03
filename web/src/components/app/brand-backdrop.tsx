import Image from "next/image";
import hall from "../../../public/brand/hall.jpg";

/** The site's gilded-hall photograph under a navy scrim, for entry screens. */
export function BrandBackdrop() {
  return (
    <>
      <Image
        src={hall}
        alt=""
        fill
        priority
        placeholder="blur"
        sizes="100vw"
        className="-z-20 object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-linear-to-b from-scrim via-scrim to-bg" />
    </>
  );
}
