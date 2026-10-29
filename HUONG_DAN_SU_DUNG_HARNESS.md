# Hướng dẫn sử dụng `harness.xml`

## Bản dành riêng cho Codex

Skill Codex đã được tạo tại `.agents/skills/harness/SKILL.md`.

- Gọi trực tiếp bằng `$harness` cùng mô tả nhiệm vụ.
- Hoặc chạy `/skills` và chọn `harness`.
- Codex cũng có thể tự chọn skill khi yêu cầu cần lập kế hoạch, sửa nhiều bước và xác minh kết quả.

Ví dụ:

```text
$harness

TASK: Sửa lỗi kết nối Caro online.
CHECKS: npm test và kiểm tra hai phiên trình duyệt.
SCOPE: Chỉ sửa server/ và tests/.
LIMIT: Tối đa 3 vòng sửa lỗi.
```

Skill dùng `AGENTS.md` thay cho `CLAUDE.md`, không tự tạo subagent khi chưa được phép và tuân theo sandbox cùng approval policy của Codex.

## Tổng quan

`harness.xml` không phải file cấu hình được tự động nạp và cũng không phải chương trình có thể chạy trực tiếp. Đây là một prompt template dạng XML dành cho Claude Code hoặc Codex, mô tả một quy trình làm việc có kiểm soát:

1. Lập kế hoạch trước khi sửa code.
2. Chỉ tải context cần thiết cho từng bước.
3. Thực thi trong phạm vi được cho phép.
4. Kiểm tra bằng test, build, type check hoặc output thực tế.
5. Sửa lỗi có giới hạn và ghi lại bài học.
6. Báo cáo kết quả, bằng chứng và các vấn đề còn lại.

Template yêu cầu các placeholder sau:

| Placeholder   | Ý nghĩa                                      |
| ------------- | -------------------------------------------- |
| `{{TASK}}`    | Nhiệm vụ cần hoàn thành                      |
| `{{OUTPUT}}`  | Thư mục hoặc file kết quả                    |
| `{{CHECKS}}`  | Các bước kiểm tra chấp nhận                  |
| `{{SOURCES}}` | Tài liệu, file hoặc nguồn cần đọc            |
| `{{SCOPE}}`   | Các file/thư mục được phép thay đổi          |
| `{{LIMIT}}`   | Giới hạn thời gian, số vòng sửa hoặc chi phí |

## Cách thủ công với Codex

Mở Codex tại thư mục dự án, sau đó gửi prompt:

```text
Đọc D:\1_Project\game_creator\harness.xml và thực hiện harness cho task sau:

TASK: <mô tả việc cần làm>
OUTPUT: <thư mục/file kết quả>
CHECKS: <các lệnh kiểm tra, ví dụ npm test>
SOURCES: <file/tài liệu cần đọc>
SCOPE: <các file được phép sửa>
LIMIT: tối đa 3 vòng sửa lỗi

Trước khi sửa file, tạo plan.md và dừng lại chờ tôi duyệt.
```

Với Codex, dùng AGENTS.md thay cho CLAUDE.md.
Có thể chạy không tương tác bằng `codex exec`:

```powershell
codex exec 'Đọc harness.xml và thực hiện task: <TASK>. Ghi plan.md, checks.md, progress.md. Không sửa ngoài phạm vi <SCOPE>.'
```

Các file được harness tạo hoặc cập nhật:

- `plan.md`: kế hoạch, file sẽ đọc/ghi, bước chạy song song và check của từng bước.
- `checks.md`: bảng `bước | yêu cầu | verdict | evidence`.
- `progress.md`: tiến độ, output, quyết định, lỗi mở và bước tiếp theo.
- `AGENTS.md`: quy tắc và bài học cần áp dụng cho các phiên Codex sau.

## Sử dụng với Claude Code

1. Mở Claude Code trong thư mục dự án.
2. Vào plan mode bằng `/plan`.
3. Dán toàn bộ nội dung `harness.xml`.
4. Thay tất cả placeholder bằng thông tin của nhiệm vụ.
5. Duyệt `plan.md` trước khi cho phép sửa code.
6. Chạy các bước và kiểm tra kết quả bằng `checks.md`.
7. Cuối phiên, xem `progress.md` và diff `CLAUDE.md`.

Bạn cũng có thể biến nó thành slash command bằng cách đặt nội dung vào .claude/commands/harness.md, rồi gọi /harness.

Claude Code cũng hỗ trợ đặt template thành slash command:

1. Tạo file `.claude/commands/harness.md`.
2. Sao chép nội dung `harness.xml` vào file.
3. Thêm phần mô tả và cú pháp nhận tham số nếu cần.
4. Gọi `/harness` trong Claude Code.

Nếu dùng placeholder `{{TASK}}` thủ công, hãy thay chúng trước khi gửi prompt. Không trông đợi Claude Code tự động điền các placeholder này.

## Ví dụ prompt hoàn chỉnh

```text
Đọc D:\1_Project\game_creator\harness.xml và thực hiện harness cho task sau:

TASK: Kiểm tra và sửa lỗi kết nối Caro online trên hai trình duyệt.
OUTPUT: D:\1_Project\game_creator\docs\caro-online-verification.md
CHECKS: npm test; npm run lint (nếu có); kiểm tra thủ công hai phiên Caro online.
SOURCES: README.md, docs/caro-online.md, server/, tests/
SCOPE: Chỉ sửa server/ và tests/; không sửa games/, assets/ hoặc index.html.
LIMIT: Tối đa 3 vòng sửa lỗi và 30 phút chạy kiểm thử.

Trước khi sửa file, tạo plan.md và dừng lại chờ tôi duyệt.
Không commit hoặc push.
```

## Lưu ý

- Repo hiện tại chưa có `CLAUDE.md`, `AGENTS.md` hoặc `plan.md`. Nếu dùng đúng nguyên bản, bước cập nhật bộ nhớ sẽ thiếu file nền. .
- Với Codex, nên tạo `AGENTS.md` trước để lưu quy tắc dự án; harness có thể tạo file này nếu được cho phép.
- `plan.md`, `checks.md` và `progress.md` là artifact của một lần chạy, không phải file cấu hình sẽ được harness tạo trong lúc chạy.
- Không cho hai agent sửa cùng một file trong cùng thời điểm.
- Luôn giới hạn số vòng sửa lỗi; không lặp vô hạn để ép test pass.
- Chỉ coi một bước là hoàn thành khi có bằng chứng thực tế như test pass, build thành công, log hoặc ảnh chụp.

## Quy trình ngắn gọn

```text
Điền placeholder
    -> tạo plan.md
    -> duyệt kế hoạch
    -> thực thi theo bước
    -> ghi checks.md
    -> sửa lỗi có giới hạn
    -> cập nhật progress.md và AGENTS.md/CLAUDE.md
    -> báo cáo kết quả và vấn đề còn lại
```
