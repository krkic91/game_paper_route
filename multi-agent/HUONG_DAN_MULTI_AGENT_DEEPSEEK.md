# Chạy nhiều agent DeepSeek bằng Codex

## 1. Cấu hình hiện tại

Harness (công cụ điều phối và thực thi) vẫn là Codex. Model được chọn thông qua provider Command Code.

File `C:\Users\ciKrk\.codex\cmd_ds.config.toml` cần có:

```toml
model_provider = "cmd_ds"
model = "deepseek/deepseek-v4.1-flash"
model_reasoning_effort = "high"
service_tier = "default"
```

File `C:\Users\ciKrk\.codex\config.toml` cần có các block sau. Nếu đã có block tương ứng, cập nhật trong block hiện có, không khai báo trùng:

```toml
[features]
multi_agent = true

[model_providers.cmd_ds]
name = "Command Code using Deepseek model"
base_url = "https://api.commandcode.ai/provider/v1"
env_key = "CMD_API_KEY"
wire_api = "responses"
```

Biến môi trường `CMD_API_KEY` phải có trong môi trường chạy Codex. Không ghi API key vào tài liệu hoặc chia sẻ key. Nếu vừa thêm biến môi trường, đóng và mở lại terminal/VS Code.

Các block trên không yêu cầu đổi model/provider mặc định của phiên chính OpenAI.

## 2. Cách A: mở nhiều phiên độc lập

Trong VS Code, mở nhiều terminal bằng **Ctrl+Shift+`**. Trong mỗi terminal chạy:

```powershell
codex --profile cmd_ds
```

Ví dụ phân chia công việc:

- Terminal 1: kiểm tra giao diện.
- Terminal 2: kiểm tra logic game.
- Terminal 3: đánh giá test.

Các phiên này độc lập, không tự chia sẻ lịch sử trò chuyện hoặc tổng hợp kết quả. Nếu chạy trong cùng thư mục, chúng vẫn có thể cùng truy cập các file dự án.

Để kiểm tra chỉ đọc:

```powershell
codex --profile cmd_ds --sandbox read-only
```

## 3. Cách B: nhiều subagent trong một phiên DeepSeek

Khởi chạy phiên cha dùng DeepSeek:

```powershell
codex --profile cmd_ds --enable multi_agent --sandbox read-only
```

Nếu `multi_agent = true` đã có trong cấu hình, có thể bỏ `--enable multi_agent`.

Gửi yêu cầu:

```text
Hãy tạo 3 subagent chạy song song:
1. Kiểm tra cấu trúc dự án.
2. Kiểm tra lỗi logic.
3. Đánh giá các test còn thiếu.

Chỉ đọc, không sửa file. Chờ cả ba hoàn thành rồi tổng hợp kết quả.
```

Trong thử nghiệm đã thực hiện, agent con mặc định kế thừa provider `cmd_ds` và model `deepseek/deepseek-v4.1-flash` từ phiên cha DeepSeek.

Bật multi-agent chỉ cho phép tạo agent con; không có nghĩa mọi tin nhắn đều tự động tạo subagent. Số lượng agent thực tế có thể chịu giới hạn của Codex và provider.

## 4. Chạy nhiệm vụ không tương tác

Ví dụ chạy một nhiệm vụ từ terminal:

```powershell
codex exec --profile cmd_ds --sandbox read-only "Kiem tra cau truc du an, khong sua file, va tom tat ket qua."
```

Có thể chạy lệnh này trong nhiều terminal với các nhiệm vụ khác nhau.

## 5. Kiểm tra model thực tế

Trong Codex CLI, dùng `/status` để xem thông tin phiên nếu phiên bản đang dùng hỗ trợ.

Để xác minh sâu hơn, kiểm tra dữ liệu phiên và log trong `C:\Users\ciKrk\.codex`. Những lần thử trước đã kiểm tra cơ sở dữ liệu phiên `state_5.sqlite` ở chế độ chỉ đọc và xác nhận:

```text
model_provider: cmd_ds
model: deepseek/deepseek-v4.1-flash
reasoning_effort: high
```

Để xác nhận subagent, kiểm tra bản ghi agent con và quan hệ `parent_thread_id`, không chỉ bản ghi phiên cha. Tên và cấu trúc cơ sở dữ liệu có thể thay đổi theo phiên bản Codex.

Không dùng câu trả lời tự giới thiệu của model làm bằng chứng. Dữ liệu phiên xác nhận model mà Codex yêu cầu provider chạy, không tự chứng minh model nội bộ mà provider thực sự triển khai.

## 6. Giới hạn đã xác minh

- Đã chạy thành công một subagent DeepSeek từ phiên cha DeepSeek.
- Đã chạy thành công một phiên `codex exec --profile cmd_ds` dùng DeepSeek.
- Chưa kiểm thử ba subagent DeepSeek chạy đồng thời.
- Với Codex 0.164.0 đã kiểm tra, role subagent không áp dụng đổi provider riêng. Tạo subagent mặc định từ phiên cha OpenAI vẫn cho ra agent con OpenAI, không tự chuyển sang profile DeepSeek.
- Có thể gọi một phiên CLI DeepSeek riêng từ quy trình điều phối khác, nhưng đó không phải subagent native qua `spawn_agent` của phiên OpenAI.
- Chạy lệnh profile trong terminal không tự đổi model của ô chat Codex extension trong VS Code.

## 7. Lưu ý an toàn và chi phí

- Bắt đầu bằng các nhiệm vụ chỉ đọc.
- Tránh để nhiều agent sửa cùng file. Nếu cần sửa song song, phân chia file rõ ràng hoặc dùng các Git worktree riêng.
- Nhiều agent làm tăng lượng token và có thể chạm giới hạn request/concurrency của Command Code.
- `model_reasoning_effort = "ultra"` đã gây HTTP 400 với API Command Code trong thử nghiệm; `"high"` chạy thành công.
- `service_tier = "priority"` được API chấp nhận trong thử nghiệm nhưng phản hồi báo tier thực tế là `default`; cấu hình profile hiện dùng `default`.
- Codex có thể cảnh báo thiếu metadata của DeepSeek và dùng metadata dự phòng; trong lần thử, yêu cầu vẫn hoàn thành.
