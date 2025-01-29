import { Request, Response } from "express";

export const autoComplete = async (req: Request, res: Response) => {
  const q = req.query.q;
  const point = req.query.point; //lat,lng
  const osmTags = req.query.osm_tag;

  if (typeof q !== "string") {
    res.status(400).json({
      error: "Invalid Query"
    });

    return;
  }

  const query = new URLSearchParams();

  query.set("q", q);

  if (typeof point === "string") query.set("point", point);

  if (Array.isArray(osmTags)) {
    osmTags.forEach((tag) => {
      query.append("osm_tag", tag as string);
    });
  } else if (typeof osmTags === "string") {
    query.set("osm_tag", osmTags);
  }

  query.set("key", process.env.GRAPHHOPPER_API_KEY!);

  fetch(
    "https://graphhopper.com/api/1/geocode?"
    + query.toString()
  )
    .then((res) => res.json())
    .then((data) => {
      res.json({
        error: null,
        data: data.hits
      });
    })
    .catch((error) => {
      console.error(error);

      res.status(500).json({
        error: "Failed to fetch search results",
        data: null
      });
    });
};