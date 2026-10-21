<!-- version v1.0 -->
# Bảy game mới · kế hoạch triển khai

Ngày 19/10/2026. Thực hiện cả sáu đề xuất đã thống nhất và thêm Cờ Thú.
Mỗi game có một sub-agent riêng; chạy tối đa ba agent cùng lúc ngoài agent
tích hợp. Giữ thư viện hiện tại, mở rộng từ 20 lên 27 game.

| Agent | Game / id | Phạm vi |
| --- | --- | --- |
| `battleship_game` | Hải chiến / `battleship` | Xếp đội tàu, bắn theo lượt, đấu máy ba mức; đối thủ chỉ dùng thông tin đã bắn. |
| `minesweeper_game` | Dò mìn / `minesweeper` | Ba mức khó, mở/cắm cờ, bàn được kiểm tra giải bằng suy luận, thử thách ngày. |
| `tower_game` | Thủ thành / `tower` | Ba bản đồ, ba loại tháp, nâng cấp/bán, nhiều loại quái và boss, 12 đợt. |
| `onet_game` | Nối thú / `onet` | Ghép cặp bằng đường tối đa hai lần rẽ, nhiều màn, ô khóa, giới hạn giờ, gợi ý/xáo trộn. |
| `blocks_game` | Xếp gạch rơi / `blocks` | Xoay/di chuyển, bóng vị trí rơi, giữ khối, túi bảy khối, xóa hàng/combo, cảm ứng. |
| `reversi_game` | Cờ lật / `reversi` | Bàn 8×8, đấu máy nhiều mức/hai người cùng máy, gợi ý có giải thích, bỏ lượt và kết thúc đúng luật. |
| `jungle_game` | Cờ Thú / `jungle` | Bàn 7×9, tám loại thú, sông/bẫy/hang, đấu máy/hai người cùng máy, hoàn tác và lật bàn. |

Hải chiến bản đầu chơi với máy. Online hai thiết bị là hướng mở rộng đã đề
xuất, chưa thuộc bản đầu này; không đưa nút online chưa hoạt động vào game.

## Phân công và tích hợp

Mỗi agent sở hữu `games/<id>-logic.js`, `games/<id>.js`, `games/<id>.css`,
`tests/<id>.test.cjs`, `tests/browser-<id>.cjs`, `docs/<id>.md`. Agent chính
sở hữu metadata, hình bìa SVG, index, package, README và kiểm tra thư viện.

- Luật xuất UMD cho Node/browser; UI đăng ký `ArcadeGames[id]`.
- Dùng `ArcadeShared` cho timer, sự kiện, tạm dừng, đóng và chơi lại.
- CSS giữ nội dung bàn trong luồng bố cục; không che nút phía dưới khi cuộn.
- Giao diện tiếng Việt, chuột/bàn phím/cảm ứng, hoạt động cục bộ.
- File mới có chú thích version v1.0; không sửa ghi chú riêng của người dùng.
- Cờ Thú và Cờ lật ghi rõ nguồn luật và biến thể được áp dụng.

## Điều kiện hoàn thành

Có thể chơi đến thắng/thua, bắt đầu ván mới và đọc luật. Kiểm tra luật,
thao tác sai, tình huống đặc biệt, AI và ván tự động; không chỉ kiểm tra UI
mở được. Kiểm tra Chromium/WebKit ở các viewport 320×740, 390×844,
820×1180, 1366×900, gồm thao tác chạm, tràn ngang, vùng bấm bị che,
tạm dừng và hủy timer khi đóng. Đây là mô phỏng trên Windows, không phải
máy ảo hay thiết bị iOS thật. Ghi kết quả thực tế sau khi hoàn tất.
