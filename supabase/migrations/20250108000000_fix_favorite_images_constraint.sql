-- 修复收藏图片表的唯一约束问题
-- 原约束基于 user_id + message_id，但同一消息的多张图片无法分别收藏
-- 改为基于 user_id + image_url，允许同一消息的不同图片分别收藏

-- 删除原有的唯一约束
DROP INDEX IF EXISTS favorite_images_unique_idx;

-- 创建新的唯一约束，基于用户ID和图片URL
CREATE UNIQUE INDEX favorite_images_unique_url_idx ON public.favorite_images(user_id, image_url);

-- 添加注释
COMMENT ON INDEX favorite_images_unique_url_idx IS 'Prevents duplicate favorites of the same image URL by the same user'; 