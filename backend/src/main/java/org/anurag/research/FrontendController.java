package org.anurag.research;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class FrontendController {
    @GetMapping({"/", "/privacy", "/terms", "/projects", "/tasks", "/team", "/updates", "/assistant", "/resources", "/profile", "/admin", "/access"})
    String application() { return "forward:/index.html"; }
}
