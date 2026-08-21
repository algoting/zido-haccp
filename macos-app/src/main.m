#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>

@interface AppDelegate : NSObject <NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate>
@property (strong, nonatomic) NSWindow *window;
@property (strong, nonatomic) WKWebView *webView;
@end

@implementation AppDelegate

- (void)applicationDidFinishLaunching:(NSNotification *)aNotification {
    [self setupMenu];
    [self setupWindow];
}

- (void)setupWindow {
    NSScreen *screen = [NSScreen mainScreen];
    CGSize screenSize = screen ? screen.visibleFrame.size : CGSizeMake(1440, 900);
    CGFloat initialWidth = MIN(1280, screenSize.width * 0.9);
    CGFloat initialHeight = MIN(840, screenSize.height * 0.9);
    
    NSRect rect = NSMakeRect((screenSize.width - initialWidth) / 2.0,
                             (screenSize.height - initialHeight) / 2.0,
                             initialWidth,
                             initialHeight);

    NSWindowStyleMask styleMask = NSWindowStyleMaskTitled |
                                  NSWindowStyleMaskClosable |
                                  NSWindowStyleMaskMiniaturizable |
                                  NSWindowStyleMaskResizable |
                                  NSWindowStyleMaskFullSizeContentView;

    self.window = [[NSWindow alloc] initWithContentRect:rect
                                              styleMask:styleMask
                                                backing:NSBackingStoreBuffered
                                                  defer:NO];
    self.window.title = @"Zido HACCP";
    self.window.minSize = NSMakeSize(380, 550);
    self.window.titlebarAppearsTransparent = YES;
    self.window.titleVisibility = NSWindowTitleHidden;
    self.window.toolbar = [[NSToolbar alloc] initWithIdentifier:@"ZidoHACCPToolbar"];
    self.window.toolbar.showsBaselineSeparator = NO;
    self.window.backgroundColor = [NSColor colorWithRed:248.0/255.0 green:250.0/255.0 blue:252.0/255.0 alpha:1.0];
    self.window.releasedWhenClosed = NO;

    WKWebViewConfiguration *config = [[WKWebViewConfiguration alloc] init];
    config.websiteDataStore = [WKWebsiteDataStore defaultDataStore];
    [config.preferences setValue:@YES forKey:@"developerExtrasEnabled"];

    self.webView = [[WKWebView alloc] initWithFrame:self.window.contentView.bounds configuration:config];
    self.webView.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
    self.webView.navigationDelegate = self;
    self.webView.UIDelegate = self;
    self.webView.allowsBackForwardNavigationGestures = YES;
    self.webView.customUserAgent = @"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) ZidoHACCP-macOS/1.0.0";

    [self.window.contentView addSubview:self.webView];
    [self.window makeKeyAndOrderFront:nil];
    [NSApp activateIgnoringOtherApps:YES];

    NSURL *url = [NSURL URLWithString:@"https://zido-haccp.online/"];
    NSURLRequest *request = [NSURLRequest requestWithURL:url cachePolicy:NSURLRequestUseProtocolCachePolicy timeoutInterval:30.0];
    [self.webView loadRequest:request];
}

- (void)setupMenu {
    NSMenu *mainMenu = [[NSMenu alloc] init];

    // App Menu
    NSMenuItem *appMenuItem = [[NSMenuItem alloc] init];
    [mainMenu addItem:appMenuItem];
    NSMenu *appMenu = [[NSMenu alloc] init];
    appMenuItem.submenu = appMenu;
    [appMenu addItemWithTitle:@"À propos de Zido HACCP" action:@selector(showAbout) keyEquivalent:@""];
    [appMenu addItem:[NSMenuItem separatorItem]];
    [appMenu addItemWithTitle:@"Masquer Zido HACCP" action:@selector(hide:) keyEquivalent:@"h"];
    NSMenuItem *hideOthers = [appMenu addItemWithTitle:@"Masquer les autres" action:@selector(hideOtherApplications:) keyEquivalent:@"h"];
    hideOthers.keyEquivalentModifierMask = NSEventModifierFlagCommand | NSEventModifierFlagOption;
    [appMenu addItemWithTitle:@"Tout afficher" action:@selector(unhideAllApplications:) keyEquivalent:@""];
    [appMenu addItem:[NSMenuItem separatorItem]];
    [appMenu addItemWithTitle:@"Quitter Zido HACCP" action:@selector(terminate:) keyEquivalent:@"q"];

    // File Menu
    NSMenuItem *fileMenuItem = [[NSMenuItem alloc] init];
    [mainMenu addItem:fileMenuItem];
    NSMenu *fileMenu = [[NSMenu alloc] initWithTitle:@"Fichier"];
    fileMenuItem.submenu = fileMenu;
    [fileMenu addItemWithTitle:@"Fermer la fenêtre" action:@selector(performClose:) keyEquivalent:@"w"];

    // Edit Menu
    NSMenuItem *editMenuItem = [[NSMenuItem alloc] init];
    [mainMenu addItem:editMenuItem];
    NSMenu *editMenu = [[NSMenu alloc] initWithTitle:@"Édition"];
    editMenuItem.submenu = editMenu;
    [editMenu addItemWithTitle:@"Annuler" action:@selector(undo:) keyEquivalent:@"z"];
    [editMenu addItemWithTitle:@"Rétablir" action:@selector(redo:) keyEquivalent:@"Z"];
    [editMenu addItem:[NSMenuItem separatorItem]];
    [editMenu addItemWithTitle:@"Couper" action:@selector(cut:) keyEquivalent:@"x"];
    [editMenu addItemWithTitle:@"Copier" action:@selector(copy:) keyEquivalent:@"c"];
    [editMenu addItemWithTitle:@"Coller" action:@selector(paste:) keyEquivalent:@"v"];
    [editMenu addItemWithTitle:@"Tout sélectionner" action:@selector(selectAll:) keyEquivalent:@"a"];

    // View Menu
    NSMenuItem *viewMenuItem = [[NSMenuItem alloc] init];
    [mainMenu addItem:viewMenuItem];
    NSMenu *viewMenu = [[NSMenu alloc] initWithTitle:@"Affichage"];
    viewMenuItem.submenu = viewMenu;
    [viewMenu addItemWithTitle:@"Actualiser" action:@selector(reloadPage) keyEquivalent:@"r"];
    NSMenuItem *forceReload = [viewMenu addItemWithTitle:@"Rechargement forcé" action:@selector(forceReloadPage) keyEquivalent:@"r"];
    forceReload.keyEquivalentModifierMask = NSEventModifierFlagCommand | NSEventModifierFlagShift;
    [viewMenu addItem:[NSMenuItem separatorItem]];
    [viewMenu addItemWithTitle:@"Plein écran" action:@selector(toggleFullScreen:) keyEquivalent:@"f"];

    // History Menu
    NSMenuItem *historyMenuItem = [[NSMenuItem alloc] init];
    [mainMenu addItem:historyMenuItem];
    NSMenu *historyMenu = [[NSMenu alloc] initWithTitle:@"Historique"];
    historyMenuItem.submenu = historyMenu;
    [historyMenu addItemWithTitle:@"Précédent" action:@selector(goBack) keyEquivalent:@"["];
    [historyMenu addItemWithTitle:@"Suivant" action:@selector(goForward) keyEquivalent:@"]"];

    // Window Menu
    NSMenuItem *windowMenuItem = [[NSMenuItem alloc] init];
    [mainMenu addItem:windowMenuItem];
    NSMenu *windowMenu = [[NSMenu alloc] initWithTitle:@"Fenêtre"];
    windowMenuItem.submenu = windowMenu;
    [windowMenu addItemWithTitle:@"Réduire" action:@selector(performMiniaturize:) keyEquivalent:@"m"];
    [windowMenu addItemWithTitle:@"Zoom" action:@selector(performZoom:) keyEquivalent:@""];

    [NSApp setMainMenu:mainMenu];
}

- (void)showAbout {
    NSAlert *alert = [[NSAlert alloc] init];
    alert.messageText = @"Zido HACCP";
    alert.informativeText = @"Version 1.0.0 (macOS)\nLogiciel de gestion et traçabilité HACCP pour restaurants et métiers de bouche.\n\nSite web : https://zido-haccp.online";
    alert.alertStyle = NSAlertStyleInformational;
    [alert addButtonWithTitle:@"OK"];
    [alert runModal];
}

- (void)reloadPage {
    [self.webView reload];
}

- (void)forceReloadPage {
    [self.webView reloadFromOrigin];
}

- (void)goBack {
    if ([self.webView canGoBack]) {
        [self.webView goBack];
    }
}

- (void)goForward {
    if ([self.webView canGoForward]) {
        [self.webView goForward];
    }
}

- (void)webView:(WKWebView *)webView decidePolicyForNavigationAction:(WKNavigationAction *)navigationAction decisionHandler:(void (^)(WKNavigationActionPolicy))decisionHandler {
    NSURL *url = navigationAction.request.URL;
    if (url) {
        NSString *host = url.host;
        if ([host isEqualToString:@"zido-haccp.online"] || [url.scheme isEqualToString:@"about"] || [url.scheme isEqualToString:@"blob"] || [url.scheme isEqualToString:@"data"]) {
            decisionHandler(WKNavigationActionPolicyAllow);
            return;
        }
        [[NSWorkspace sharedWorkspace] openURL:url];
        decisionHandler(WKNavigationActionPolicyCancel);
        return;
    }
    decisionHandler(WKNavigationActionPolicyAllow);
}

- (WKWebView *)webView:(WKWebView *)webView createWebViewWithConfiguration:(WKWebViewConfiguration *)configuration forNavigationAction:(WKNavigationAction *)navigationAction windowFeatures:(WKWindowFeatures *)windowFeatures {
    NSURL *url = navigationAction.request.URL;
    if (url) {
        [[NSWorkspace sharedWorkspace] openURL:url];
    }
    return nil;
}

- (BOOL)applicationShouldTerminateAfterLastWindowClosed:(NSApplication *)sender {
    return YES;
}

@end

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        NSApplication *app = [NSApplication sharedApplication];
        AppDelegate *delegate = [[AppDelegate alloc] init];
        app.delegate = delegate;
        [app setActivationPolicy:NSApplicationActivationPolicyRegular];
        [app run];
    }
    return 0;
}
