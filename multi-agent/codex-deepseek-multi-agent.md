# Dùng Codex điều phối các worker DeepSeek

Hướng dẫn này dùng Codex với model OpenAI làm orchestrator, và các tiến trình Codex CLI riêng dùng DeepSeek làm worker.

```text
Codex / gpt-6.1-sol
  ├── codex exec --profile cmd_ds → DeepSeek: phân tích
  ├── codex exec --profile cmd_ds → DeepSeek: review
  └── đọc kết quả, kiểm chứng và tổng hợp
```

## 1. Giới hạn của subagent tích hợp

Subagent tích hợp kế thừa provider của agent chính. File custom agent có thể đổi model, nhưng không thể ghi đè `model_provider`.

Vì vậy, để agent chính dùng OpenAI và worker dùng provider `cmd_ds`, hãy chạy worker bằng các tiến trình `codex exec` riêng. Các worker này không phải thread subagent tích hợp; orchestrator nhận kết quả qua file đầu ra.

Tham khảo: [Tài liệu OpenAI về subagent](https://learn.chatgpt.com/docs/agent-configuration/subagents).

## 2. Cấu hình đang có trên máy

Cấu hình chính trong `C:\Users\ciKrk\.codex\config.toml` đã chọn OpenAI:

```toml
model_provider = "openai"
model = "gpt-6.1-sol"
model_reasoning_effort = "medium"
service_tier = "priority"
```

Provider DeepSeek qua Command Code đã được khai báo trong cùng file:

```toml
[model_providers.cmd_ds]
name = "Command Code using Deepseek model"
base_url = "https://api.commandcode.ai/provider/v1"
env_key = "CMD_API_KEY"
wire_api = "responses"
```

Profile `C:\Users\ciKrk\.codex\cmd_ds.config.toml`:

```toml
model_provider = "cmd_ds"
model = "deepseek/deepseek-v4.1-flash"
model_reasoning_effort = "max"
service_tier = "default"
```

Đảm bảo môi trường chạy worker có biến `CMD_API_KEY` hợp lệ. Không ghi API key vào file hướng dẫn hoặc commit vào Git.

## 3. Mở orchestrator

Mở terminal trong thư mục dự án và chạy:

```powershell
codex.cmd
```

Lệnh này dùng cấu hình OpenAI mặc định. Dùng `codex.cmd` trên Windows cũng tránh lỗi PowerShell chặn script `codex.ps1`.

## 4. Giao việc cho worker DeepSeek

Dán prompt sau vào phiên Codex chính, rồi thay nhiệm vụ theo nhu cầu:

```text
Bạn là orchestrator. Chia công việc thành các phần độc lập và chạy
các worker DeepSeek bằng codex.cmd exec --profile cmd_ds.

Chạy song song khi phù hợp. Mỗi worker ghi kết quả vào file riêng.
Không cho worker tạo thêm agent; truyền -c agents.enabled=false.
Bạn đọc kết quả, kiểm chứng và tổng hợp câu trả lời cuối cùng.
Nếu worker thất bại, báo lỗi và không coi file đầu ra cũ là kết quả mới.

Nhiệm vụ: review code hiện tại, tìm bug và phần thiếu kiểm thử.
```

## 5. Lệnh worker mẫu

Worker tìm bug, chỉ đọc code:

```powershell
codex.cmd exec --profile cmd_ds --sandbox read-only `
  -c agents.enabled=false `
  -o review-bugs.md `
  "Tìm bug trong code hiện tại. Không sửa file. Báo vị trí và cách tái hiện."
```

Worker tìm phần thiếu kiểm thử:

```powershell
codex.cmd exec --profile cmd_ds --sandbox read-only `
  -c agents.enabled=false `
  -o review-tests.md `
  "Review phần thiếu kiểm thử trong code hiện tại. Không sửa file. Nêu tình huống cần test và file liên quan."
```

Hai lệnh trên là ví dụ cho hai nhiệm vụ độc lập. Chạy từng lệnh trong hai terminal để thực hiện song song, hoặc để orchestrator khởi chạy và theo dõi chúng.

Ý nghĩa các tùy chọn:

| Tùy chọn | Mục đích |
| --- | --- |
| `--profile cmd_ds` | Chọn profile dùng DeepSeek qua Command Code |
| `--sandbox read-only` | Cho worker phân tích mà không sửa code qua công cụ shell |
| `-c agents.enabled=false` | Tắt công cụ tạo subagent trong worker |
| `-o <file>` | CLI lưu câu trả lời cuối của worker vào file |

## 6. Tổng hợp kết quả

Sau khi worker hoàn tất, orchestrator cần:

1. Kiểm tra tiến trình hoàn tất thành công và file đầu ra thuộc lần chạy hiện tại.
2. Đọc `review-bugs.md` và `review-tests.md`.
3. Đối chiếu các phát hiện với code, loại bỏ kết luận không có bằng chứng.
4. Tổng hợp vấn đề theo mức độ ảnh hưởng, kèm vị trí file.

Nếu giao worker sửa code, dùng `--sandbox workspace-write` và phân chia file hoặc Git worktree riêng để tránh xung đột. Worker chạy riêng không tự nhận toàn bộ hội thoại của orchestrator, nên prompt giao việc cần có đủ ngữ cảnh, phạm vi và kết quả mong muốn.

## 7. Trạng thái xác minh

- Đã kiểm tra cấu hình local và cú pháp `codex.cmd exec --help` trên CLI `0.164.0`.
- Chưa chạy thử toàn bộ luồng orchestrator–worker với API Command Code.
- Profile local chọn reasoning `max`; mức reasoning được provider thực tế chấp nhận cần xác minh khi chạy.
