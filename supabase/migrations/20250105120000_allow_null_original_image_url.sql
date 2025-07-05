-- 允许 image_tasks 表的 original_image_url 字段为 NULL
-- 这是为了支持无图片时的文生图功能

ALTER TABLE public.image_tasks
ALTER COLUMN original_image_url DROP NOT NULL;

-- 添加注释说明
COMMENT ON COLUMN public.image_tasks.original_image_url IS 'Original image URL for editing, can be NULL for text-to-image generation'; 