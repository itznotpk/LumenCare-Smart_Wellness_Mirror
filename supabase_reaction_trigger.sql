-- ==============================================================================
-- 1. Auto-Format Mirror Reaction Messages
-- This script catches any reaction sent by the Smart Mirror and automatically
-- generates a human-friendly sentence for the Caregiver App to display.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.format_mirror_reaction_message()
RETURNS TRIGGER AS $$
BEGIN
    -- Only auto-generate the message if the python script didn't explicitly send one
    IF NEW.message IS NULL OR NEW.message = '' THEN
        IF NEW.reaction_type = 'smile' OR NEW.reaction_type = 'smiled' THEN
            NEW.message := 'Dad smiled at the mirror!';
        ELSIF NEW.reaction_type = 'laugh' OR NEW.reaction_type = 'laughed' THEN
            NEW.message := 'Dad was laughing at the mirror!';
        ELSIF NEW.reaction_type = 'cry' OR NEW.reaction_type = 'cried' THEN
            NEW.message := 'Dad had an emotional reaction.';
        ELSIF NEW.reaction_type = 'wave' OR NEW.reaction_type = 'waved' THEN
            NEW.message := 'Dad waved at you!';
        ELSIF NEW.reaction_type = 'read' OR NEW.reaction_type = 'viewed' THEN
            NEW.message := 'Dad read your daily drop.';
        ELSIF NEW.reaction_type = 'sos' OR NEW.reaction_type = 'help' THEN
            NEW.message := 'URGENT: Dad asked for help!';
        ELSE
            NEW.message := 'Dad interacted with the mirror.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 2. Bind the Trigger to the Table
-- ==============================================================================
DROP TRIGGER IF EXISTS trigger_format_mirror_reaction ON public.mirror_reactions;

CREATE TRIGGER trigger_format_mirror_reaction
BEFORE INSERT OR UPDATE ON public.mirror_reactions
FOR EACH ROW EXECUTE FUNCTION public.format_mirror_reaction_message();
