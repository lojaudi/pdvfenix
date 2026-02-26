import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    if (!query || query.trim().length < 2) {
      return new Response(JSON.stringify({ images: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchQuery = encodeURIComponent(query.trim());

    // Use DuckDuckGo image search
    // Step 1: Get VQD token
    const tokenRes = await fetch(`https://duckduckgo.com/?q=${searchQuery}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    const tokenBody = await tokenRes.text();
    const vqdMatch = tokenBody.match(/vqd=['"]([^'"]+)['"]/);

    if (!vqdMatch) {
      console.error("Could not extract VQD token");
      // Fallback: try alternative approach
      return new Response(JSON.stringify({ images: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vqd = vqdMatch[1];

    // Step 2: Fetch images
    const imgRes = await fetch(
      `https://duckduckgo.com/i.js?l=br-pt&o=json&q=${searchQuery}&vqd=${vqd}&f=size:Medium,type:photo&p=1`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Referer: "https://duckduckgo.com/",
        },
      }
    );

    const imgData = await imgRes.json();
    const results = (imgData.results || [])
      .slice(0, 12)
      .map((r: any) => ({
        url: r.image,
        thumbnail: r.thumbnail,
        title: r.title,
        source: r.source,
      }))
      .filter((r: any) => r.url && r.thumbnail);

    return new Response(JSON.stringify({ images: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error searching images:", error);
    return new Response(
      JSON.stringify({ images: [], error: "Falha ao buscar imagens" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
