import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { name, jobTitle, companyName, website, existingNotes } = await req.json();

    console.log('Generating AI summary for:', { name, jobTitle, companyName, website });

    // Prepare context from user inputs
    const contextParts = [];
    if (name) contextParts.push(`Name: ${name}`);
    if (jobTitle) contextParts.push(`Designation: ${jobTitle}`);
    if (companyName) contextParts.push(`Company: ${companyName}`);
    if (existingNotes) contextParts.push(`Existing Notes: ${existingNotes}`);

    // Try to fetch website content if URL provided
    let websiteContent = '';
    if (website) {
      try {
        const websiteUrl = website.startsWith('http') ? website : `https://${website}`;
        console.log('Fetching website content from:', websiteUrl);
        
        const websiteResponse = await fetch(websiteUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; BusinessCardBot/1.0)',
          },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        if (websiteResponse.ok) {
          const html = await websiteResponse.text();
          
          // Extract meta description
          const metaDescMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
          const metaDesc = metaDescMatch?.[1] || '';
          
          // Extract title
          const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
          const pageTitle = titleMatch?.[1] || '';
          
          // Extract Open Graph description
          const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
          const ogDesc = ogDescMatch?.[1] || '';
          
          // Combine extracted info
          websiteContent = [pageTitle, metaDesc, ogDesc].filter(Boolean).join(' | ');
          
          if (websiteContent) {
            console.log('Website content extracted successfully');
            contextParts.push(`Company Website Info: ${websiteContent.substring(0, 500)}`);
          }
        }
      } catch (error) {
        console.log('Failed to fetch website, will use fallback:', error.message);
      }
    }

    // If no website content and we have company name, add it to context for AI to work with
    if (!websiteContent && companyName) {
      contextParts.push(`Note: Generate a professional summary based on the company name and role. Use general industry knowledge if needed.`);
    }

    const context = contextParts.join('\n');

    const prompt = `You are writing a professional "About" section for a digital business card. Generate a concise, polished professional summary of 5-6 lines maximum based on the following information:

${context}

Instructions:
- Write in a professional, natural tone suitable for a business card
- Focus on the person's role, expertise, and company activities
- Be specific and factual, avoid exaggeration
- Do NOT mention that information was extracted from websites or sources
- Present as a natural professional bio
- Keep it to 5-6 lines maximum
- Write in third person if name is provided, otherwise use first person

Generate the summary now:`;

    // Call OnSpace AI
    const aiBaseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');
    const aiApiKey = Deno.env.get('ONSPACE_AI_API_KEY');

    if (!aiBaseUrl || !aiApiKey) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Calling OnSpace AI...');
    const aiResponse = await fetch(`${aiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('OnSpace AI error:', errorText);
      return new Response(
        JSON.stringify({ error: `AI service error: ${errorText}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices?.[0]?.message?.content?.trim();

    if (!summary) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate summary' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI summary generated successfully');

    return new Response(
      JSON.stringify({ summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-ai-summary:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
